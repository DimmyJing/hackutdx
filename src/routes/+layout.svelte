<script lang="ts">
	import './app.css';
	import Toaster from '$lib/components/Toaster.svelte';
	import { page } from '$app/stores';
	import { onNavigate } from '$app/navigation';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { onAuthStateChanged } from 'firebase/auth';
	import { auth, userStore } from '$lib/firebase';

	onNavigate((navigation) => {
		if (
			!(document as unknown as { startViewTransition: (cb: () => void) => void })
				.startViewTransition
		)
			return;

		return new Promise((resolve) => {
			(
				document as unknown as { startViewTransition: (cb: () => void) => void }
			).startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	onAuthStateChanged(auth, (user) => {
		userStore.set(user);
	});
</script>

<svelte:head>
	<title>Dr. Squared</title>
</svelte:head>

<Toaster />

{#if $page.url.pathname !== '/'}
	<nav class="shadow">
		<div class="px-2 mx-auto max-w-7xl sm:px-6 lg:px-8">
			<div class="relative flex justify-between h-16">
				<div class="flex items-center justify-center flex-1 sm:items-stretch sm:justify-start">
					<div class="flex items-center flex-shrink-0">
						<a href="/"> <AppIcon /></a>
					</div>
					<div class="sm:ml-6 sm:flex sm:space-x-8">
						<a
							href="/submission"
							class={$page.url.pathname.includes('/submission')
								? 'inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-indigo-500'
								: 'inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700'}
						>
							Submission
						</a>
						<a
							href="/review"
							class={$page.url.pathname.includes('/review')
								? 'inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-indigo-500'
								: 'inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700'}
						>
							Review
						</a>
						<a
							href="/pastreviews"
							class={$page.url.pathname.includes('/pastreviews')
								? 'inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-indigo-500'
								: 'inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700'}
						>
							Past Reviews
						</a>
					</div>
				</div>
			</div>
		</div>
	</nav>
{/if}

<slot />
