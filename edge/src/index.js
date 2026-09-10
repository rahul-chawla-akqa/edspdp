/// <reference types="@fastly/js-compute" />

import postsHandler, { passThroughEds } from './posts.js';

async function handleRequest(event) {
  const { request } = event;
  const url = new URL(request.url);

  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }
    if (url.pathname === '/hello-world') {
      return new Response('posts-composer', { status: 200 });
    }
    if (url.pathname === '/posts' || url.pathname.startsWith('/posts/')) {
      return postsHandler(request);
    }
    return passThroughEds(request);
  } catch (error) {
    console.log(error);
    return new Response('Bad gateway', { status: 502 });
  }
}

addEventListener('fetch', (fetchEvent) => fetchEvent.respondWith(handleRequest(fetchEvent))); // eslint-disable-line no-restricted-globals
