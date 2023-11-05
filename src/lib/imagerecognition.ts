import type { diagnosisType } from './reviewsstore';
import { createWorker } from 'tesseract.js';

export async function imageRecognition(file: File): Promise<diagnosisType> {
	const worker = await createWorker('eng');
	const ret = await worker.recognize(file);
	console.log(ret.data.text);
	await worker.terminate();

	const resp = await fetch('/api/ocr?diagnosis=' + ret.data.text);
	const respJSON = (await resp.json()) as {
		symptom: string;
		treatment: string;
		diagnosis: string;
		patientInfo: string;
	};

	return {
		symptom: respJSON.symptom,
		treatment: respJSON.treatment,
		diagnosis: respJSON.diagnosis,
		patientInfo: respJSON.patientInfo,
		attachments: [],
		diagnosisID: '',
		doctorName: '',
		reviewStatus: 'UNREVIEWED',
		feedback: '',
		tags: []
	};
}
