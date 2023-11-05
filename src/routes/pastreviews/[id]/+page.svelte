<script lang="ts">
	import { reviews } from '$lib/reviewsstore';
	import type { PageData } from './$types';
	export let data: PageData;

	function formatBytes(bytes: number, decimals = 2) {
		if (!+bytes) return '0 Bytes';

		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
	}

	function downloadFile(file: File) {
		let url = URL.createObjectURL(file);

		let a = document.createElement('a');
		a.href = url;
		a.download = file.name;

		document.body.appendChild(a);
		a.click();

		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	$: reviewInstance = $reviews.find((review) => review.diagnosisID === data.reviewID);
</script>

<div class="flex flex-col items-center w-full mt-10">
	<div class="w-full max-w-5xl">
		<div class="px-4 sm:px-0">
			<h3 class="text-base font-semibold leading-7 text-gray-900">
				{reviewInstance?.doctorName}'s Diagnosis Information
			</h3>
			<p class="max-w-2xl mt-1 text-sm leading-6 text-gray-500">Information about your diagnosis</p>
		</div>
		<div class="mt-6 border-t border-gray-100">
			<dl class="divide-y divide-gray-200">
				<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
					<dt class="text-sm font-medium leading-6 text-gray-900">Diagnosis</dt>
					<dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
						{reviewInstance?.diagnosis}
					</dd>
				</div>
				<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
					<dt class="text-sm font-medium leading-6 text-gray-900">Treatment</dt>
					<dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
						{reviewInstance?.treatment}
					</dd>
				</div>
				<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
					<dt class="text-sm font-medium leading-6 text-gray-900">Symptom</dt>
					<dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
						{reviewInstance?.symptom}
					</dd>
				</div>
				<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
					<dt class="text-sm font-medium leading-6 text-gray-900">Patient Info</dt>
					<dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
						{reviewInstance?.patientInfo}
					</dd>
				</div>
				{#if reviewInstance?.attachments.length ?? 0 > 0}
					<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt class="text-sm font-medium leading-6 text-gray-900">Attachments</dt>
						<dd class="mt-2 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
							<ul class="border border-gray-200 divide-y divide-gray-100 rounded-md">
								{#each reviewInstance?.attachments ?? [] as attachment}
									<li class="flex items-center justify-between py-4 pl-4 pr-5 text-sm leading-6">
										<div class="flex items-center flex-1 w-0">
											<svg
												class="flex-shrink-0 w-5 h-5 text-gray-400"
												viewBox="0 0 20 20"
												fill="currentColor"
												aria-hidden="true"
											>
												<path
													fill-rule="evenodd"
													d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z"
													clip-rule="evenodd"
												/>
											</svg>
											<div class="flex flex-1 min-w-0 gap-2 ml-4">
												<span class="font-medium truncate">{attachment.name}</span>
												<span class="flex-shrink-0 text-gray-400">
													{formatBytes(attachment.size)}
												</span>
											</div>
										</div>
										<div class="flex-shrink-0 ml-4">
											<button
												on:click={() => {
													downloadFile(attachment);
												}}
												class="font-medium text-indigo-600 hover:text-indigo-500"
											>
												Download
											</button>
										</div>
									</li>
								{/each}
							</ul>
						</dd>
					</div>
				{/if}
				<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
					<dt class="text-sm font-medium leading-6 text-gray-900">Feedback</dt>
					<dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
						{reviewInstance?.feedback}
					</dd>
				</div>
				<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
					<dt class="text-sm font-medium leading-6 text-gray-900">Hospital Feedback</dt>
					<dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">Good Job!</dd>
				</div>
			</dl>
		</div>
	</div>
</div>
