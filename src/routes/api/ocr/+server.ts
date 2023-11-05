import { OPENAI_API_KEY } from '$env/static/private';
import OpenAI from 'openai';

const tagsPrompt = `Given the following input, please format it into symptom, treatment, diagnosis, and patientInfo`;

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
				content: tagsPrompt
			},
			{
				role: 'user',
				content: diagnosis
			}
		],
		model: 'gpt-4',
		function_call: {
			name: 'print_tags'
		},
		functions: [
			{
				name: 'print_tags',
				description: 'prints tags based on the input',
				parameters: {
					type: 'object',
					properties: {
						symptom: { type: 'string' },
						treatment: { type: 'string' },
						diagnosis: { type: 'string' },
						patientInfo: { type: 'string' }
					},
					required: ['symptom', 'treatment', 'diagnosis', 'patientInfo']
				}
			}
		]
	});

	return new Response(
		JSON.stringify(
			JSON.parse(chatCompletion.choices[0].message.function_call?.arguments ?? '') as {
				symptom: string;
				treatment: string;
				diagnosis: string;
				patientInfo: string;
			}
		)
	);
}
