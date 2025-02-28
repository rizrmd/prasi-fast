export const apiClient = <T extends { handler: any }>(path: string) => {
  if (typeof window === "undefined") {
    return null as any;
  }
  let cfg = (window as any).config as typeof config;
  return (async (...args: any[]) => {
    if (!cfg) {
      await new Promise<void>((done) => {
        const ival = setInterval(() => {
          if ((window as any).config) {
            done();
            clearInterval(ival);
          }
        }, 10);
      });
      cfg = (window as any).config as typeof config;
    }
    const url = new URL(cfg.backend.url);
    url.pathname = path;
    const res = await fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify(args),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await res.json();
  }) as T["handler"];
};
