export default class PrefixCommand {
    name: string;
    description: string;

    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
    }

    exec(args?: string[]) {
        throw new Error("Method not implemented.");
    }
}