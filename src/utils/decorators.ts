import {client} from "../index";
import {Collection, CommandInteraction} from "discord.js";
import {ceil} from "lodash";

export function maxConcurrency(target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any) {
        const interaction: CommandInteraction = args[0];
        const concurrencyCache = client.commandCache[propertyKey] ??= new Collection();

        let inCommand = concurrencyCache.get(interaction.user.id) as boolean;
        if (inCommand === undefined) concurrencyCache.set(interaction.user.id, inCommand = false);

        if (inCommand) return await interaction.reply({content: 'You cannot use this command more than one at a time.', ephemeral: true});

        concurrencyCache.set(interaction.user.id, true);
        await originalMethod.apply(this, args);
        concurrencyCache.set(interaction.user.id, false);
    }
}

export function cooldown(seconds: number) {
    return function (target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any) {
            const interaction: CommandInteraction = args[0];
            const cooldownCache = client.commandCache[propertyKey] ??= new Collection();

            let lastCalled = cooldownCache.get(interaction.user.id) as number;
            if (lastCalled === undefined) cooldownCache.set(interaction.user.id, lastCalled = new Date().getTime());

            const endTime = lastCalled + (seconds * 1000);
            const timeNow = new Date().getTime();
            if (lastCalled < timeNow && timeNow < endTime) return await interaction.reply({
                content: `You are on cooldown. Please try again in \`${ceil((endTime - new Date().getTime()) / 1000)}s\`.`,
                ephemeral: true
            });

            cooldownCache.set(interaction.user.id, new Date().getTime());
            await originalMethod.apply(this, args);
        }
    }
}
