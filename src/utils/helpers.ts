export enum currencyId {
    Opals,
    Gold,
    Clovers
}

export const currencyEmotes: Record<number, string> = {
    [currencyId.Opals]: ":opals:",
    [currencyId.Gold]: ":gold:",
    [currencyId.Clovers]: ":four_leaf_clover:"
}
