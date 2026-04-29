async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/admin/force-badges');
    const data = await res.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fetch failed:', e.message);
    console.log('Trying direct call to badges.ts logic...');
    // If localhost is not available, we can't fetch it easily.
    // But I can try to find the actual Vercel URL if it's deployed.
  }
}

main();
