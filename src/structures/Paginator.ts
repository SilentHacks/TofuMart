import {
    MessageButton,
    MessageEmbed,
    EmojiIdentifierResolvable,
    MessageButtonStyleResolvable,
    CommandInteraction,
    MessageActionRow,
    ButtonInteraction,
    Message
} from "discord.js";
import {MessageButtonStyles} from "discord.js/typings/enums";
import _ from "lodash";

interface ButtonOption {
    emoji?: EmojiIdentifierResolvable;
    label?: string;
    style: Exclude<MessageButtonStyleResolvable, 'LINK' | MessageButtonStyles.LINK>;
}

const availableEmojis = ["⏮️", "◀️", "▶️", "⏭️"];

class Paginator {
    private index = 0;

    /**
     *
     * @param {CommandInteraction} interaction - The command interaction
     * @param {MessageEmbed[]} pages - Embed pages
     * @param {string} [footerText] - Optional footer text, will show `Text 1 of 5` if you pass `Text`, for example
     * @param {number} timeout - How long button need to be active
     * @param {ButtonOption[]} options - optional options for the buttons
     * @param {(elems: any[], userId?: string) => MessageEmbed} embedCallback - optional callback to chunk embeds
     */
    constructor(
        private interaction: CommandInteraction,
        private readonly pages: MessageEmbed[] | any[],
        private readonly footerText: string = "Page",
        private readonly timeout: number = 60000,
        private readonly options?: ButtonOption[],
        embedCallback?: (elems: any[], userId?: string) => MessageEmbed
    ) {
        if (options && options.length != 4) throw new TypeError("You must pass 4 buttons");

        if (embedCallback !== undefined) this.pages = this.chunkEmbeds(this.pages, embedCallback);

        this.pages = this.pages.map((page: MessageEmbed, index) => {
            if (page.footer && (page.footer.text || page.footer.iconURL)) return page;
            return page.setFooter({
                text: `${footerText} ${index + 1} of ${this.pages.length}`
            });
        });
    }

    /**
     * Get an array of embeds to be passed into the paginator
     */
    private chunkEmbeds<T>(content: Array<T>, embedCallback: (elems: Array<T>) => MessageEmbed): Array<MessageEmbed> {
        return _.chunk(content, 10).map((value) => embedCallback(value));
    }

    /**
     * Get a MessageActionRow with the optional pagination options supplied
     */
    private getComponents(disabled: boolean = false): MessageActionRow {
        return new MessageActionRow()
            .addComponents(this.options ? this.options.map((x, i) => {
                    return new MessageButton({
                        type: 2,
                        style: x.style,
                        label: x.label,
                        emoji: x.emoji,
                        customId: availableEmojis[i],
                        disabled: disabled
                    })
                }) : [
                    {
                        type: 2,
                        style: "PRIMARY",
                        label: "First",
                        emoji: availableEmojis[0],
                        customId: availableEmojis[0],
                        disabled: disabled
                    }, {
                        type: 2,
                        style: "PRIMARY",
                        label: "Prev",
                        emoji: availableEmojis[1],
                        customId: availableEmojis[1],
                        disabled: disabled

                    }, {
                        type: 2,
                        style: "PRIMARY",
                        label: "Next",
                        emoji: availableEmojis[2],
                        customId: availableEmojis[2],
                        disabled: disabled
                    }, {
                        type: 2,
                        style: "PRIMARY",
                        label: "Last",
                        emoji: availableEmojis[3],
                        customId: availableEmojis[3],
                        disabled: disabled
                    }
                ]
            )
    }

    /**
     * Starts the pagination
     */
    public async paginate(): Promise<void> {
        const curPage = await this.interaction.reply({
            fetchReply: true,
            embeds: [this.pages[this.index]],
            components: [this.getComponents(this.pages.length < 2)],
        }) as Message;

        // Return early if no need to paginate
        if (this.pages.length < 2) return;

        const filter = (i: ButtonInteraction) => i.user.id === this.interaction.user.id

        const collector = curPage.createMessageComponentCollector({
            filter,
            componentType: 'BUTTON',
            time: this.timeout
        });

        collector.on("collect", async (i) => {
            switch (i.customId) {
                case availableEmojis[0]:
                    this.index = 0;
                    break;
                case availableEmojis[1]:
                    this.index = this.index > 0 ? --this.index : this.pages.length - 1;
                    break;
                case availableEmojis[2]:
                    this.index = this.index + 1 < this.pages.length ? ++this.index : 0;
                    break;
                case availableEmojis[3]:
                    this.index = this.pages.length - 1;
                    break;
                default:
                    break;
            }
            await i.deferUpdate();
            await i.editReply({embeds: [this.pages[this.index]]});
            collector.resetTimer();
        });

        collector.on("end", (_, reason) => {
            if (reason !== "messageDelete") {
                curPage.edit({
                    embeds: [this.pages[this.index]],
                    components: [this.getComponents(true)]
                });
            }
        });
    }
}

export {
    ButtonOption,
    Paginator
}