import { OPENAI_API_KEY } from '$env/static/private';
import OpenAI from 'openai';

const tagsPrompt = `Given the following input, please output a list of tags that best suits the diagnosis`;

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
						tags: {
							type: 'array',
							items: {
								type: 'string',
								enum: [
									'Cardiologist',
									'Dermatologist',
									'Gastroenterologist',
									'Endocrinologist',
									'Pediatrician',
									'Psychiatrist',
									'Rheumatologist',
									'Ophthalmologist',
									'Nephrologist',
									'Hematologist',
									'Orthopedist',
									'Anesthesiologist',
									'Pulmonologist',
									'Infectious Disease Specialist',
									'Gynecologist'
								]
							}
						}
					},
					required: ['tags']
				}
			}
		]
	});

	return new Response(
		JSON.stringify(
			(
				JSON.parse(chatCompletion.choices[0].message.function_call?.arguments ?? '') as {
					tags: string[];
				}
			).tags
		)
	);
}
