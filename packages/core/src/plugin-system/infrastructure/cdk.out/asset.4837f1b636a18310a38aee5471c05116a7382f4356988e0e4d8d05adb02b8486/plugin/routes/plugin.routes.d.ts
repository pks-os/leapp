import { PluginDto } from "../dto/plugin.dto";
import { PluginService } from "../service/plugin.service";
import { PluginConverter } from "../converter/plugin.converter";
export declare class PluginRoutes {
    pluginService: PluginService;
    pluginConverter: PluginConverter;
    pluginList(q?: string): Promise<PluginDto[]>;
    getPlugin(pluginId: string): Promise<PluginDto>;
    createPlugin(): Promise<void>;
    updatePlugin(): Promise<void>;
}
