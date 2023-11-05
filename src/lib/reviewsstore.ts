import { writable } from 'svelte/store';
import { v4 } from 'uuid';

export type diagnosisType = {
	symptom: string;
	treatment: string;
	diagnosis: string;
	patientInfo: string;
	diagnosisID: string;
	attachments: File[];
	doctorName: string;
	reviewStatus: 'UNREVIEWED' | 'REVIEWED' | 'REJECTED';
	feedback: string;
	tags: string[];
};

type diagnosisStoreType = diagnosisType & {
	notificationSent: boolean;
};

export function getID() {
	return v4();
}

export const reviews = writable<diagnosisStoreType[]>([]);
