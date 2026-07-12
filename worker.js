export default {
  async fetch() {
    return Response.json({
      atlas: "V4",
      status: "running",
      time: new Date().toISOString(),
    });
  },
};
