import { OPENAI_API_KEY } from '$env/static/private';
import untruncateJson from '$lib/untruncate';
import OpenAI from 'openai';
import { event } from 'sveltekit-sse';

const severityPrompt = `Our app enhances diagnostic accuracy by allowing doctors to upload patient data and their initial diagnosis. The app then provides a confidence percentage based on the alignment with clinical data and severity percentage considering potential consequences of alternative diagnoses.

The application prompts targeted follow-up questions to refine the diagnostic process. For example, it may ask if specific tests were performed or if patient history has been thoroughly considered in relation to the treatment plan.

If a diagnosis falls below a set confidence threshold, such as 30%, it's flagged for specialist review, with urgency dictated by the potential severity of the condition.

Here's where I need your assistance: Based on the patient data and initial diagnosis provided, can you generate a confidence score from 0 to 100? Please support the score with three clear medical justifications, addressing how each piece of data supports or contradicts the initial diagnosis. For instance, if you provide a confidence score of 63, clarify how specific symptoms such as a headache may not typically correlate with a heart attack, which would impact the confidence score negatively. Conversely, explain how the presence of corroborating symptoms like a runny nose and mild cough would support a diagnosis of a common cold, thus affecting the confidence score positively. The rationale should be clear and relatable to the user.`;
const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

export async function GET({ url }) {
	const diagnosis = url.searchParams.get('diagnosis');

	const chatCompletion = await openai.chat.completions.create({
		temperature: 0,
		messages: [
			{
				role: 'user',
				content: severityPrompt
			},
			{
				role: 'user',
				content: diagnosis
			}
		],
		model: 'gpt-4',
		function_call: {
			name: 'print_confidence_score_and_reasoning'
		},
		functions: [
			{
				name: 'print_confidence_score_and_reasoning',
				description: 'prints confidence score and reasoning based on the input',
				parameters: {
					type: 'object',
					properties: {
						score: {
							type: 'number',
							description: 'confidence score from 0 to 100'
						},
						reasoning: {
							type: 'array',
							items: {
								type: 'string'
							}
						}
					},
					required: ['reasoning']
				}
			}
		],
		stream: true
	});

	let runningCompletion = '';
	const runningReasoning: string[] = [];
	let hasScore = false;

	const limit = 5;

	return event(async (emit) => {
		for await (const chunk of chatCompletion) {
			runningCompletion += chunk.choices[0].delta.function_call?.arguments ?? '';
			const result = JSON.parse(untruncateJson(runningCompletion) || '{}') as {
				score?: number;
				reasoning?: string[];
			};
			if (result.score && !hasScore) {
				hasScore = true;
				emit('' + result.score);
			}
			if (result.reasoning && result.reasoning.length > runningReasoning.length + 1) {
				result.reasoning.pop();
				runningReasoning.push(result.reasoning.pop() ?? '');
				emit(runningReasoning[runningReasoning.length - 1] + '\n');
				if (runningReasoning.length >= limit) {
					emit('CLOSE');
					return;
				}
			}
		}

		runningReasoning.push(
			(JSON.parse(runningCompletion) as { reasoning: string[] }).reasoning.pop() ?? ''
		);
		emit(runningReasoning[runningReasoning.length - 1] + '\n');
		emit('CLOSE');
	}).toResponse();
}
