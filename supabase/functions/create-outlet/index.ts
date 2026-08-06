

console.log("CREATE OUTLET FUNCTION STARTED");

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "CREATE OUTLET FUNCTION READY",
        received: body,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
});