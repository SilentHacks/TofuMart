import path from "path";
import fetch from "node-fetch";

const sharp = require("sharp");

const cardWidth = 300;
const cardHeight = 450;
const rowCards = 5;

export default async function buildAuctionList(imageUrls: Array<string>) {
    const dir = path.resolve(__dirname, "../resources");

    const composites = [];
    let cardNum = 1;

    const widthOffset = 20;
    const heightOffset = 30;

    const startX = -cardWidth;
    const startY = (heightOffset / 2) >> 0;

    const xSpacing = cardWidth + widthOffset;
    const ySpacing = cardHeight + heightOffset;

    for (let imageUrl of imageUrls) {
        const image = await fetch(imageUrl);
        const imageBuffer = await image.buffer();

        const left = startX + (cardNum % rowCards) * xSpacing;
        const top = startY + ((cardNum / rowCards) >> 0) * ySpacing;

        composites.push({
            input: imageBuffer,
            top: top,
            left: left
        });

        cardNum++;
    }

    try {
        await sharp({
            create: {
                width: (cardWidth * rowCards) + (widthOffset * (rowCards) + 1),
                height: ySpacing * 2,
                channels: 3,
                background: {r: 47, g: 49, b: 54}
            }
        })
            .composite(composites)
            .toFile(`${dir}/auction.png`);
    } catch (error) {
        console.log(error);
    }
}