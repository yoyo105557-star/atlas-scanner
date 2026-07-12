export default {
  async fetch(request) {

    if (request.method !== "POST") {
      return Response.json({
        status: "Atlas Worker Ready",
        message: "Send POST JSON."
      });
    }

    try {

      const data = await request.json();

      return Response.json({
        status: "received",
        data
      });

    } catch (err) {

      return Response.json(
        {
          status: "error",
          message: err.message
        },
        { status: 400 }
      );

    }

  }
}
