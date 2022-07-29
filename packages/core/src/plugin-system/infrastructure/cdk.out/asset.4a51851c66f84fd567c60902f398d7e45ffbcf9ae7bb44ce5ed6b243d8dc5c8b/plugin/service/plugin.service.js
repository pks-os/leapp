"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginService = void 0;
const service_1 = require("../../core/service");
const data_api_connector_1 = require("../../database/data-api-connector");
const plugin_converter_1 = require("../converter/plugin.converter");
const custom_error_1 = require("../../core/custom.error");
const http_status_code_enum_1 = require("../../enum/http-status-code.enum");
class PluginService extends service_1.Service {
    constructor(region) {
        super(region);
        this.dataApiConnector = new data_api_connector_1.DataApiConnector();
        this.pluginConverter = new plugin_converter_1.PluginConverter();
    }
    async listPlugin(queryParam) {
        const pluginListRds = (await this.dataApiConnector.executeStatement(`SELECT p.*, a.id a_id, a.name AS a_name, a.email AS a_email, s.id AS s_id, s.name AS s_name FROM plugin AS p
            JOIN author a ON p.author_id = a.id
            JOIN status s ON p.status_id = s.id
            WHERE p::text ILIKE :queryParam
            OR a::text ILIKE :queryParam
            OR s::text ILIKE :queryParam`, {
            queryParam: queryParam ? `%${queryParam}%` : '%%'
        })).records;
        return pluginListRds.map((pluginRdsModel) => this.pluginConverter.fromRds(pluginRdsModel));
    }
    async getPlugin(pluginName) {
        const pluginRds = (await this.dataApiConnector.executeStatement(`SELECT p.*, a.id a_id, a.name AS a_name, a.email AS a_email, s.id AS s_id, s.name AS s_name FROM plugin AS p
            JOIN author a ON p.author_id = a.id
            JOIN status s ON p.status_id = s.id
            WHERE p.plugin_name = :name`, {
            name: pluginName
        })).records[0];
        if (!pluginRds) {
            throw new custom_error_1.CustomError(http_status_code_enum_1.HTTPStatusCodeEnum.notFound, "Plugin Not Found");
        }
        return this.pluginConverter.fromRds(pluginRds);
    }
}
exports.PluginService = PluginService;
//# sourceMappingURL=plugin.service.js.map