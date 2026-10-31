const params = new URLSearchParams(location.search);
if (params.has('scene') || params.has('scenes')) {
    const { mountTrials } = await import('./scene-app.js');
    mountTrials();
}
else
    await import('./main.js');
export {};
