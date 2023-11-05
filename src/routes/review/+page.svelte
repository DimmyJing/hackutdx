<script lang="ts">
	import { addToast } from '$lib/components/Toaster.svelte';
	import { reviews } from '$lib/reviewsstore';
	import { onMount } from 'svelte';
	import { ChevronRight, Icon } from 'svelte-hero-icons';
	import doctor from './doctor.png';

	$: if ($reviews.length > 0) {
		const newReviews = $reviews;
		for (const review of newReviews) {
			if (!review.notificationSent) {
				review.notificationSent = true;
				addToast({
					data: {
						title: 'New review',
						description: `A new review has been submitted`,
						color: 'bg-primary'
					}
				});
			}
		}
		reviews.set(newReviews);
	}

	onMount(() => {
		reviews.update((old) => old);
	});
</script>

<div class="flex flex-col items-center w-full m-8 gap-y-4">
	{#each $reviews.filter((el) => el.reviewStatus === 'UNREVIEWED') as review}
		<a href={'/review/' + review.diagnosisID} class="w-full max-w-4xl bg-gray-500 shadow-xl card">
			<div class="flex flex-row items-center justify-between w-full text-left card-body">
				<div class="flex flex-row items-center gap-x-2">
					<p class="mr-2 text-2xl text-white">{review.doctorName}'s Diagnosis</p>
					{#each review.tags as tag}
						<p
							class="rounded-md whitespace-nowrap mt-0.5 px-1.5 py-0.5 text-xs ring-1 ring-inset text-gray-600 bg-primary font-medium"
						>
							{tag}
						</p>
					{/each}
				</div>
				<Icon src={ChevronRight} class="w-8 h-8 text-white" />
			</div>
		</a>
	{/each}
	{#if $reviews.filter((el) => el.reviewStatus === 'UNREVIEWED').length === 0}
		<img src={doctor} alt="doctor" class="w-full max-w-2xl" />
	{/if}
</div>
