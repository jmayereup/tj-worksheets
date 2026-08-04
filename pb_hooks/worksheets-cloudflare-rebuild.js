// Stateless helper module loaded via require() inside each JSVM handler.
// Module-level state is fine here because this file is evaluated once and
// cached; handlers should NOT capture module-scope variables directly
// because each handler is serialized and executed in isolation.

module.exports = function triggerCloudflareRebuild(logger, collection, recordId) {
    const deployHookUrl = "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/9bcde703-70bb-4046-8794-fed92562fe0c";

    try {
        $http.send({
            url:     deployHookUrl,
            method:  "POST",
            timeout: 15,
        });
        logger.info(
            "Cloudflare rebuild triggered",
            "collection", collection,
            "recordId", recordId,
        );
    } catch (err) {
        logger.error(
            "Cloudflare rebuild failed",
            "collection", collection,
            "recordId", recordId,
            "err", err,
        );
    }
};
