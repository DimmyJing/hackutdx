<script lang="ts">
	import clsx from 'clsx';
	import { imageRecognition } from '$lib/imagerecognition';
	import {
		Icon,
		Photo,
		PaperAirplane,
		XMark,
		Check,
		BellAlert,
		Envelope,
		QuestionMarkCircle,
		ArrowPath,
		Folder
	} from 'svelte-hero-icons';
	import { slide } from 'svelte/transition';
	import { getID, reviews } from '$lib/reviewsstore';
	import { userStore } from '$lib/firebase';
	import { source } from 'sveltekit-sse';

	let fileInput: HTMLInputElement;
	let uploadInput: HTMLInputElement;

	let imageRecognitionFileList: FileList;

	function unsetUploadFileCleared() {
		uploadFileCleared = false;
	}

	let uploadFiles: FileList;
	let uploadFileList: File[] = [];
	let uploadFileCleared = false;
	$: if (uploadFiles) {
		uploadFileList = [];
		for (let i = 0; i < uploadFiles.length; i++) {
			const item = uploadFiles.item(i);
			if (item) uploadFileList.push(item);
		}
		if (uploadFileCleared) {
			uploadFileList = [];
			unsetUploadFileCleared();
		}
	}

	let symptom = '';
	let treatment = '';
	let diagnosis = '';
	let patientinfo = '';

	$: allDiagnosisInfo = `Symptoms: ${symptom}\n\nTreatment: ${treatment}\n\nDiagnosis: ${diagnosis}\n\nPatient Info: ${patientinfo}`;

	let imageRecognitionLoading = false;
	let uploadLoading = false;
	let sendDiagnosisLoading = false;

	let confidenceValue = 0;
	let severityValue = 0;
	let sentForReview = false;

	let sentForReviewInput: HTMLInputElement;
	$: if (sentForReviewInput) sentForReviewInput.checked = sentForReview;

	let confidenceCounter: HTMLSpanElement;
	let severityCounter: HTMLSpanElement;

	$: if (confidenceCounter)
		confidenceCounter.style.setProperty('--value', confidenceValue.toString());
	$: if (severityCounter) severityCounter.style.setProperty('--value', severityValue.toString());

	let followUpQuestions: string[] = [];
	let confidenceReasoning: string[] = [];
	let severityReasoning: string[] = [];

	$: newSeverityReasoning = severityReasoning.map(
		(el) =>
			JSON.parse(el) as {
				diagnoseName: string;
				diagnoseDescription: string;
				diagnoseConfidence: number;
				diagnoseSeverity: number;
			}
	);

	$: {
		if (imageRecognitionFileList && imageRecognitionFileList.length > 0) {
			imageRecognitionLoading = true;
			imageRecognition(imageRecognitionFileList.item(0)!).then((res) => {
				imageRecognitionLoading = false;
				symptom = res.symptom;
				treatment = res.treatment;
				diagnosis = res.diagnosis;
				patientinfo = res.patientInfo;
				fileInput.value = '';
			});
		}
	}

	let updateLoading = false;

	function convertColor(value: number) {
		if (value < 12.5) {
			return 'text-[#F87272]';
		} else if (value < 25) {
			return 'text-[#E17D7B]';
		} else if (value < 37.5) {
			return 'text-[#CA8884]';
		} else if (value < 50) {
			return 'text-[#B1948E]';
		} else if (value < 62.5) {
			return 'text-[#7DADA3]';
		} else if (value < 75) {
			return 'text-[#68B7AB]';
		} else if (value < 87.5) {
			return 'text-[#4FC2B5]';
		} else {
			return 'text-[#37CDBE]';
		}
	}

	async function processFollowUpQuestions(): Promise<void> {
		return new Promise<void>((res) => {
			const value = source('/api/followup?diagnosis=' + encodeURIComponent(allDiagnosisInfo));
			value.subscribe((data) => {
				if (data === '') return;
				if (data === 'CLOSE') {
					value.close();
					res();
				} else {
					followUpQuestions = [...followUpQuestions, data];
				}
			});
		});
	}

	async function processConfidenceReasoning(): Promise<void> {
		return new Promise<void>((res) => {
			let hasScore = false;
			const value = source('/api/confidence?diagnosis=' + encodeURIComponent(allDiagnosisInfo));
			value.subscribe((data) => {
				if (data === '') return;
				if (!hasScore) {
					confidenceValue = parseFloat(data);
					hasScore = true;
					return;
				}
				if (data === 'CLOSE') {
					value.close();
					res();
				} else {
					confidenceReasoning = [...confidenceReasoning, data];
				}
			});
		});
	}

	async function processSeverityReasoning(): Promise<void> {
		return new Promise<void>((res) => {
			let hasScore = false;
			const value = source('/api/severity?diagnosis=' + encodeURIComponent(allDiagnosisInfo));
			value.subscribe((data) => {
				if (data === '') return;
				if (!hasScore) {
					severityValue = parseFloat(data);
					hasScore = true;
					return;
				}
				if (data === 'CLOSE') {
					value.close();
					res();
				} else {
					severityReasoning = [...severityReasoning, data];
				}
			});
		});
	}

	function onSendUpdate() {
		updateLoading = true;
		followUpQuestions = [];
		confidenceReasoning = [];
		severityReasoning = [];
		confidenceValue = 0;
		severityValue = 0;
		sentForReview = false;

		Promise.all([
			processFollowUpQuestions(),
			processConfidenceReasoning(),
			processSeverityReasoning()
		]).then(() => (updateLoading = false));
	}

	function onSendDiagnosis() {
		sendDiagnosisLoading = true;
		followUpQuestions = [];
		confidenceReasoning = [];
		severityReasoning = [];
		confidenceValue = 0;
		severityValue = 0;
		sentForReview = false;

		const tagsPromise = fetch('/api/tags?diagnosis=' + encodeURIComponent(allDiagnosisInfo)).then(
			(el) => el.json() as Promise<string[]>
		);

		Promise.all([
			tagsPromise,
			processFollowUpQuestions(),
			processConfidenceReasoning(),
			processSeverityReasoning()
		]).then(([tags]) => {
			sendDiagnosisLoading = false;

			if (severityValue < 30 && confidenceValue < 30) sentForReview = true;
			else if (severityValue >= 30 && severityValue < 60 && confidenceValue < 60)
				sentForReview = true;
			else if (severityValue >= 60 && confidenceValue < 90) sentForReview = true;

			if (sentForReview) {
				reviews.update((oldReviews) => [
					...oldReviews,
					{
						diagnosis,
						treatment,
						symptom,
						patientInfo: patientinfo,
						notificationSent: false,
						diagnosisID: getID(),
						attachments: uploadFileList,
						doctorName: 'Dr. ' + ($userStore?.displayName?.split(' ').pop() ?? 'Anonymous'),
						reviewStatus: 'UNREVIEWED',
						feedback: '',
						tags: tags
					}
				]);
			}
		});
	}
</script>

<div class="grid grid-cols-2 p-4 divide-x">
	<div class="p-8 pr-16">
		<div class="form-control">
			<label for="diagnosis" class="label">
				<span class="font-bold label-text">Diagnosis</span>
			</label>
			<textarea
				id="diagnosis"
				class="textarea textarea-bordered"
				placeholder="Enter primary diagnosis here (e.g., Asthma)"
				rows="1"
				bind:value={diagnosis}
			/>
		</div>
		<div class="form-control">
			<label for="treatment" class="label">
				<span class="font-bold label-text">Treatment</span>
			</label>
			<textarea
				id="treatment"
				class="textarea textarea-bordered"
				placeholder="List treatment plan here  (e.g., Inhaler as needed, Ibuprofen 400 mg, 3 times a day)"
				rows="1"
				bind:value={treatment}
			/>
		</div>
		<div class="w-full form-control">
			<label for="symptom" class="label">
				<span class="font-bold label-text">Symptoms</span>
			</label>
			<textarea
				id="symptom"
				class="textarea textarea-bordered"
				placeholder="Describe symptoms here (e.g., Shortness of breath, wheezing)"
				rows="6"
				bind:value={symptom}
			/>
		</div>
		<div class="form-control">
			<label for="patientinfo" class="label">
				<span class="font-bold label-text">Patient Info</span>
			</label>
			<textarea
				id="patientinfo"
				class="textarea textarea-bordered"
				placeholder="Patient Info (i.e., Age, Weight/Height, Sex, Current Medications, Past Medical History)"
				rows="6"
				bind:value={patientinfo}
			/>
		</div>
		{#if uploadFileList.length > 0}
			<div class="mt-2">
				<span class="font-bold label-text">Attachments</span>
				<div class="flex flex-row mt-1 gap-x-2">
					{#each uploadFileList as file}
						<span
							class="inline-flex items-center gap-x-0.5 rounded-md bg-primary px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
						>
							{file.name}
						</span>
					{/each}
				</div>
			</div>
		{/if}
		<div class="flex flex-row justify-between mt-4">
			<button
				on:click={() => {
					symptom = '';
					diagnosis = '';
					patientinfo = '';
					treatment = '';
					uploadFileCleared = true;
				}}
				class="btn btn-error"
			>
				<Icon src={XMark} class="w-6 h-6" />
				Clear
			</button>
			<input
				type="file"
				class="hidden"
				bind:this={fileInput}
				accept="image/*"
				bind:files={imageRecognitionFileList}
			/>
			<button on:click={() => fileInput.click()} class="self-start btn btn-accent">
				{#if imageRecognitionLoading}
					<span class="loading loading-dots" />
				{:else}
					<Icon src={Photo} class="w-6 h-6" />
				{/if}
				Scan
			</button>
			<input type="file" class="hidden" bind:this={uploadInput} multiple bind:files={uploadFiles} />
			<button on:click={() => uploadInput.click()} class="self-start btn btn-secondary">
				{#if uploadLoading}
					<span class="loading loading-dots" />
				{:else}
					<Icon src={Folder} class="w-6 h-6" />
				{/if}
				Attach
			</button>
			<button class="btn btn-primary" on:click={onSendUpdate}>
				<Icon src={ArrowPath} class={clsx('w-6 h-6', updateLoading && 'animate-spin')} />
				Update
			</button>
			<button class="gap-0 btn btn-neutral" on:click={onSendDiagnosis}>
				<div class="relative">
					<Icon
						src={PaperAirplane}
						class={clsx(
							'w-6 h-6 transition ease-in-out duration-500 absolute left-0 -bottom-3',
							sendDiagnosisLoading && 'translate-x-12 opacity-0 absolute'
						)}
					/>
					{#if sendDiagnosisLoading}
						<span class="absolute left-0 w-6 h-6 loading loading-dots -bottom-3" />
					{/if}
				</div>
				<div class="w-6 h-6 mr-2" />
				Submit
			</button>
		</div>
	</div>
	<div class="p-8 pl-16">
		<div class="w-full grid-cols-3 shadow stats">
			<div class="stat">
				<div class="stat-figure text-secondary">
					<Icon src={Check} class="w-8 h-8" />
				</div>
				<div class="stat-title">Confidence</div>
				<span class="stat-value countdown {convertColor(confidenceValue)}">
					<span style="--value:0;" bind:this={confidenceCounter} />%
				</span>
			</div>

			<div class="stat">
				<div class="stat-figure text-secondary">
					<Icon src={BellAlert} class="w-8 h-8" />
				</div>
				<div class="stat-title">Severity</div>
				<span class="stat-value countdown {convertColor(100 - severityValue)}">
					<span style="--value:0;" bind:this={severityCounter} />%
				</span>
			</div>

			<div class="stat">
				<div class="stat-figure text-secondary">
					<Icon src={Envelope} class="w-8 h-8" />
				</div>
				<div class="stat-title">Sent For Review</div>
				<label
					class="cursor-default stat-value swap place-content-start {sentForReview
						? 'text-[#F87272]'
						: 'text-gray-400'}"
				>
					<input type="checkbox" bind:this={sentForReviewInput} disabled />
					<div class="swap-on">YES</div>
					<div class="swap-off">NO</div>
				</label>
			</div>
		</div>
		<div class="flex flex-row items-center mt-8 gap-x-2">
			<Icon src={QuestionMarkCircle} class="w-8 h-8 stroke-1" />
			<h1 class="text-3xl font-extralight">Follow-Up Questions</h1>
		</div>
		<dl class="mx-10 my-8 divide-y divide-gray-300">
			{#each followUpQuestions as followUpQuestion, i (i)}
				<dd class="pt-4 pb-4 text-base leading-7 text-gray-600 first:pt-0 last:pb-0" in:slide>
					{followUpQuestion}
				</dd>
			{/each}
		</dl>
		<div class="flex flex-row items-center mt-8 gap-x-2">
			<Icon src={Check} class="w-8 h-8 stroke-1" />
			<h1 class="text-3xl font-extralight">Confidence Measure</h1>
		</div>
		<dl class="mx-10 my-8 divide-y divide-gray-300">
			{#each confidenceReasoning as confidenceReasoning, i (i)}
				<dd class="pt-4 pb-4 text-base leading-7 text-gray-600 first:pt-0 last:pb-0" in:slide>
					{confidenceReasoning}
				</dd>
			{/each}
		</dl>
		<div class="flex flex-row items-center mt-8 gap-x-2">
			<Icon src={BellAlert} class="w-8 h-8 stroke-1" />
			<h1 class="text-3xl font-extralight">Severity Measure</h1>
		</div>
		<dl class="grid-cols-2 mx-10 my-8 divide-y divide-gray-300">
			{#each newSeverityReasoning as severityReasoning, i (i)}
				<div class="py-4 border-t border-gray-100 first:pt-0 last:pb-0" in:slide>
					<dl>
						<div class="px-4 py-1 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt class="text-sm font-medium leading-6 text-gray-900">Diagnose Name</dt>
							<dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
								{severityReasoning.diagnoseName}
							</dd>
						</div>
						<div class="px-4 py-1 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt class="text-sm font-medium leading-6 text-gray-900">Description</dt>
							<dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
								{severityReasoning.diagnoseDescription}
							</dd>
						</div>
						<div class="px-4 py-1 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt class="text-sm font-medium leading-6 text-gray-900">Confidence</dt>
							<dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
								{severityReasoning.diagnoseConfidence}%
							</dd>
						</div>
						<div class="px-4 py-1 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt class="text-sm font-medium leading-6 text-gray-900">Severity</dt>
							<dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
								{severityReasoning.diagnoseSeverity}%
							</dd>
						</div>
					</dl>
				</div>
			{/each}
		</dl>
	</div>
</div>
