import {ButtonInteraction, CommandInteraction, MessageActionRow, MessageButton, MessageEmbed, User} from "discord.js";
import getConfig from "../utils/config";

const config = getConfig();

export default class Confirmation {
    private interaction: CommandInteraction;
    private user: User;
    private readonly checkFunc: () => Promise<boolean>;

    private readonly passDesc: string;
    private readonly cancelDesc: string;
    private failDesc: string;
    private confirmed: boolean = false;

    private readonly title: string | undefined;
    private readonly description: string | undefined;
    private readonly footer: string | undefined;
    private readonly imageUrl: string | undefined;
    private readonly thumbnailUrl: string | undefined;

    private embed: MessageEmbed | undefined;
    private reactFuncs: Map<string, Function>;

    constructor(interaction: CommandInteraction, checkFunc: () => Promise<boolean>, passDesc: string, failDesc: string, cancelDesc: string,
                options?: { title?: string; description?: string; footer?: string; imageUrl?: string; thumbnailUrl?: string; embed?: MessageEmbed }) {
        this.interaction = interaction;
        this.user = interaction.user;
        this.checkFunc = checkFunc;

        this.passDesc = passDesc;
        this.failDesc = failDesc;
        this.cancelDesc = cancelDesc;

        this.title = options ? options.title : undefined;
        this.description = options ? options.description : undefined;
        this.footer = options ? options.footer : undefined;
        this.imageUrl = options ? options.imageUrl : undefined;
        this.thumbnailUrl = options ? options.thumbnailUrl : undefined;

        this.embed = options ? options.embed : undefined;
        this.reactFuncs = new Map<string, Function>([
            ['confirm', this.confirmFunc],
            ['cancel', this.cancelFunc]
        ]);
    }

    private async setup() {
        if (this.embed === undefined) {
            this.embed = new MessageEmbed({
                ...config.embeds.primary,
                title: this.title,
                description: this.description,
            });
            if (this.footer) this.embed.setFooter({text: this.footer});
            if (this.imageUrl) this.embed.setImage(this.imageUrl);
            if (this.thumbnailUrl) this.embed.setThumbnail(this.thumbnailUrl);
        }

        const row = new MessageActionRow()
            .addComponents([
                new MessageButton()
                    .setCustomId('cancel')
                    .setLabel('Cancel')
                    .setStyle('DANGER'),
                new MessageButton()
                    .setCustomId('confirm')
                    .setLabel('Confirm')
                    .setStyle('SUCCESS')
            ]);

        return await this.interaction.reply({embeds: [this.embed], components: [row], fetchReply: true});
    }

    private async updateEmbed(buttons: boolean = false) {
        if (buttons) {
            await this.interaction.editReply({embeds: [this.embed!]});
        } else {
            await this.interaction.editReply({embeds: [this.embed!], components: []});
        }
    }

    confirmFunc = async () => {
        try {
            this.confirmed = await this.checkFunc();
        } catch (e) {
            this.failDesc = `**${e}**`;
        }

        this.embed!.color = this.confirmed ? config.embeds.success.color! : config.embeds.fail.color!;
        this.embed!.description = this.confirmed ? `${this.embed!.description}**${this.passDesc}**` : `${this.embed!.description}**${this.failDesc}**`;
        await this.updateEmbed();
    }

    cancelFunc = async () => {
        this.embed!.color = config.embeds.fail.color!;
        this.embed!.description = `${this.embed!.description}**${this.cancelDesc}**`
        await this.updateEmbed();
    }

    public async confirm(): Promise<boolean> {
        const message = await this.setup();

        const filter = (i: ButtonInteraction) => {
            return i.message.id == message.id && i.user.id === this.interaction.user.id && this.reactFuncs.has(i.customId);
        };

        let interaction: ButtonInteraction;
        try {
            interaction = await this.interaction.channel!.awaitMessageComponent({
                filter,
                componentType: 'BUTTON',
                time: 60000
            });
        } catch (e) {
            return false;
        }

        await this.reactFuncs.get(interaction.customId)!();

        return this.confirmed;
    }
}