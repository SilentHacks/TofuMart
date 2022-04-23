import {
    ButtonInteraction,
    CommandInteraction,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    User
} from "discord.js";
import getConfig from "../utils/config";

const config = getConfig();

export default class Confirmation {
    private user: User;
    private confirmed: boolean = false;

    private readonly title?: string;
    private readonly description?: string;
    private readonly footer?: string;
    private readonly imageUrl?: string;
    private readonly thumbnailUrl?: string;

    private embed?: MessageEmbed;
    private message?: Message;
    private reactFuncs: Map<string, Function>;

    constructor(
        private interaction: CommandInteraction,
        private readonly checkFunc: () => Promise<boolean>,
        private readonly passDesc: string,
        private failDesc: string,
        private readonly cancelDesc: string,
        options?: { title?: string; description?: string; footer?: string; imageUrl?: string; thumbnailUrl?: string; embed?: MessageEmbed }
    ) {
        this.user = interaction.user;

        this.title = options?.title;
        this.description = options?.description;
        this.footer = options?.footer;
        this.imageUrl = options?.imageUrl;
        this.thumbnailUrl = options?.thumbnailUrl;

        this.embed = options?.embed;
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

        this.message = await this.interaction.reply({embeds: [this.embed], components: [row], fetchReply: true}) as Message;
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
        await this.setup();

        const filter = (i: ButtonInteraction) => i.user.id === this.interaction.user.id

        let interaction: ButtonInteraction;
        try {
            interaction = await this.message!.awaitMessageComponent({
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