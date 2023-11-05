import { OPENAI_API_KEY } from '$env/static/private';
import untruncateJson from '$lib/untruncate';
import OpenAI from 'openai';
import { event } from 'sveltekit-sse';

const severityPrompt = `Dr. Squared is a cutting-edge app designed to combat misdiagnosis, enabling physicians to upload patient symptoms and their initial diagnosis for a comprehensive review.

Our system calculates a diagnostic confidence percentage to gauge accuracy and a severity percentage to reflect the potential risk of alternate diagnoses. Remember, our severity scale is critical and precise: it spans from 0 to 100, with 100 representing a condition that is immediately life-threatening or terminal.

Dr. Squared prompts doctors with smart, context-aware questions about patient history and related health data to ensure a thorough diagnostic evaluation.

For our severity assessments, we are seeking a refined approach. Given the patient's information and the doctor's initial diagnosis, please provide a severity score in line with our scale, where a score of 100 is reserved for the most dire outcomes. Accompany this score with three alternative diagnoses and their respective confidence percentages, ensuring that each alternative reflects a realistic potential health risk. For example, a common cold misdiagnosed as influenza should receive a moderate severity score, considering the possible complications, but it should be distinctly lower than life-threatening conditions.

An additional example is:
diagnoseName: Aortic Dissection
description: A serious condition in which the inner layer of the aorta, the large blood vessel branching off the heart, tears.  Blood surges through the tear, causing the inner and middle layers of the aorta to separate (dissect).
confidence: 60
severity: 90
`;
const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

export async function GET({ url }) {
	const diagnosis = url.searchParams.get('diagnosis');

	const chatCompletion = await openai.chat.completions.create({
		temperature: 0,
		messages: [
			{ role: 'user', content: severityPrompt },
			{ role: 'user', content: diagnosis }
		],
		model: 'gpt-4',
		function_call: {
			name: 'print_severity_score_and_reasoning'
		},
		functions: [
			{
				name: 'print_severity_score_and_reasoning',
				description: 'prints severity score and reasoning based on the input',
				parameters: {
					type: 'object',
					properties: {
						score: {
							type: 'number',
							description: 'severity score from 0 to 100'
						},
						reasoning: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									diagnoseName: { type: 'string' },
									diagnoseDescription: { type: 'string' },
									diagnoseConfidence: { type: 'number', description: '0 to 100' },
									diagnoseSeverity: { type: 'number', description: '0 to 100' }
								}
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
				reasoning?: {
					diagnoseName: string;
					diagnoseDescription: string;
					diagnoseConfidence: number;
					diagnoseSeverity: number;
				}[];
			};
			if (result.score && !hasScore) {
				hasScore = true;
				emit('' + result.score);
			}
			if (result.reasoning && result.reasoning.length > runningReasoning.length + 1) {
				result.reasoning.pop();
				runningReasoning.push(JSON.stringify(result.reasoning.pop()) ?? '');
				emit(runningReasoning[runningReasoning.length - 1] + '\n');
				if (runningReasoning.length >= limit) {
					emit('CLOSE');
					return;
				}
			}
		}

		runningReasoning.push(
			JSON.stringify((JSON.parse(runningCompletion) as { reasoning: string[] }).reasoning.pop()) ??
				''
		);
		emit(runningReasoning[runningReasoning.length - 1] + '\n');
		emit('CLOSE');
	}).toResponse();
}
