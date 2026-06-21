try {
  console.log("Fetching https://1.1.1.1 ...");
  const res = await fetch("https://1.1.1.1");
  console.log("Status:", res.status);
} catch (err) {
  console.error("Fetch failed:", err);
}

export {};

