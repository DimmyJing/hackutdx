import { OPENAI_API_KEY } from '$env/static/private';
import untruncateJson from '$lib/untruncate';
import OpenAI from 'openai';
import { event } from 'sveltekit-sse';

const followUpPrompt = `Can you My app helps with misdiagnosis. Our app allows a doctor to upload the patient and symptom data along with their own diagnosis

Our application will then evaluate the confidence % (of how accurate it seems to be) and the severity % (based on how bad the alternate diagnoses could be)

The app will then ask some follow-up questions, like "did you take the patient's blood pressure" or "did you consider that based off this patient's past history of eczema that this prescription may harm his health." It also gives the reasoning behind the confidence and severity measures

Now, if this diagnosis is below a certain confidence level, say 30%, then it'll be flagged and sent for review to a doctor who might specialize in this certain area. Those with higher severities are looked at first.

Now, here's where you come in: given some data about the patient and the diagnosis made, there are obviously other diseases/diagnoses that can be made. Please generate 3 very clever and likely-to-be-missed important follow-up questions. So whether this is a "based off of the patient's past history of headaches and dizziness, have you considered this aspect or asking/measuring the patient's blood pressure?" Or just "how long has the patient been experiencing these symptoms?" or "Are there any activities that seem to make the symptoms better or worse?" You can be creative and explicative here.`;

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
				content: followUpPrompt
			},
			{
				role: 'user',
				content: diagnosis
			}
		],
		model: 'gpt-4',
		function_call: {
			name: 'print_follow_up_questions'
		},
		functions: [
			{
				name: 'print_follow_up_questions',
				description: 'prints follow up questions based on the input',
				parameters: {
					type: 'object',
					properties: {
						questions: {
							type: 'array',
							items: {
								type: 'string'
							}
						}
					},
					required: ['questions']
				}
			}
		],
		stream: true
	});

	let runningCompletion = '';
	const runningQuestions: string[] = [];

	const limit = 5;

	return event(async (emit) => {
		for await (const chunk of chatCompletion) {
			runningCompletion += chunk.choices[0].delta.function_call?.arguments ?? '';
			const result = JSON.parse(untruncateJson(runningCompletion) || '{}') as {
				questions?: string[];
			};
			if (result.questions && result.questions.length > runningQuestions.length + 1) {
				result.questions.pop();
				runningQuestions.push(result.questions.pop() ?? '');
				emit(runningQuestions[runningQuestions.length - 1] + '\n');
				if (runningQuestions.length >= limit) {
					emit('CLOSE');
					return;
				}
			}
		}

		runningQuestions.push(
			(JSON.parse(runningCompletion) as { questions: string[] }).questions.pop() ?? ''
		);
		emit(runningQuestions[runningQuestions.length - 1] + '\n');
		emit('CLOSE');
	}).toResponse();
}
