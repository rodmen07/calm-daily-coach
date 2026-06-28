type RustBridgeCheckinRequest = {
  type: "checkin";
  mood: number;
  energy: number;
  friction?: string;
};

type RustBridgePlanRequest = {
  type: "plan";
  priorities: string[];
  stop?: string;
  effort?: "low" | "medium" | "high";
  focus?: string;
};

type RustBridgeCheckinResponse = {
  request_type: "checkin";
  advice?: {
    message?: string;
    strategy?: string;
  };
};

type RustBridgePlanResponse = {
  request_type: "plan";
  text_brief?: string;
};

function getBridgeUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_RUST_COACH_BRIDGE_URL?.trim();
  return value ? value : null;
}

async function callRustBridge<TResponse>(payload: RustBridgeCheckinRequest | RustBridgePlanRequest): Promise<TResponse | null> {
  const url = getBridgeUrl();
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as TResponse;
    return data;
  } catch {
    return null;
  }
}

export async function getRustCheckinAdvice(input: {
  mood: number;
  energy: number;
  friction?: string;
}): Promise<string | null> {
  const data = await callRustBridge<RustBridgeCheckinResponse>({
    type: "checkin",
    mood: input.mood,
    energy: input.energy,
    friction: input.friction,
  });

  return data?.advice?.message?.trim() ? data.advice.message : null;
}

export async function getRustPlanBrief(input: {
  priorities: string[];
  stop?: string;
  effort?: "low" | "medium" | "high";
  focus?: string;
}): Promise<string | null> {
  const data = await callRustBridge<RustBridgePlanResponse>({
    type: "plan",
    priorities: input.priorities,
    stop: input.stop,
    effort: input.effort,
    focus: input.focus,
  });

  return data?.text_brief?.trim() ? data.text_brief : null;
}
