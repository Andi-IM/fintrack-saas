export function formatErrorResponse(error: unknown) {
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    message =
      (err.message as string) ||
      (err.error_description as string) ||
      (err.details as string) ||
      JSON.stringify(error);
  } else {
    message = String(error);
  }

  process.stderr.write(`[FinTrack MCP Error] ${message}\n`);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ success: false, error: message }, null, 2),
      },
    ],
    isError: true,
  };
}

export function formatSuccessResponse(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      },
    ],
  };
}
