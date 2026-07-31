/// <reference path="../pb_data/types.d.ts" />

// Each JSVM handler is serialized and executed as an isolated program, so
// variables/functions declared at file scope are NOT accessible inside the
// handler body. The Cloudflare trigger is therefore loaded via require()
// inside each handler (see .agents/skills/pocketbase-best-practices/rules/
// ext-jsvm-scope.md).

onRecordAfterCreateSuccess(function (e) {
    const triggerCloudflareRebuild = require(`${__hooks}/worksheets-cloudflare-rebuild.js`);
    triggerCloudflareRebuild($app.logger(), "worksheets", e.record.id);
    e.next();
}, "worksheets");

onRecordAfterUpdateSuccess(function (e) {
    const triggerCloudflareRebuild = require(`${__hooks}/worksheets-cloudflare-rebuild.js`);
    triggerCloudflareRebuild($app.logger(), "worksheets", e.record.id);
    e.next();
}, "worksheets");

onRecordAfterDeleteSuccess(function (e) {
    const triggerCloudflareRebuild = require(`${__hooks}/worksheets-cloudflare-rebuild.js`);
    triggerCloudflareRebuild($app.logger(), "worksheets", e.record.id);
    e.next();
}, "worksheets");
