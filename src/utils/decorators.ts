import {client} from "../index";
import {Collection, CommandInteraction} from "discord.js";

export function maxConcurrency(target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any) {
        const interaction: CommandInteraction = args[0];
        const concurrencyCache = client.commandCache[propertyKey] ??= new Collection();

        let inCommand = concurrencyCache.get(interaction.user.id);
        if (inCommand === undefined) {
            concurrencyCache.set(interaction.user.id, false);
            inCommand = false;
        }

        if (inCommand) return await interaction.reply({content: 'You cannot use this command more than one at a time.', ephemeral: true});

        concurrencyCache.set(interaction.user.id, true);
        await originalMethod.apply(this, args);
        concurrencyCache.set(interaction.user.id, false);
    }
}