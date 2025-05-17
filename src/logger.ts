import pc from "picocolors";

export const whiteBold = (string: string) => pc.bold(pc.whiteBright(string));
export const gray = (string: string) => pc.gray(string);
export const grayBold = (string: string) => pc.bold(pc.gray(string));
export const bgWhite = (string: string) => pc.bgWhite(string);
export const bgWhiteBright = (string: string) => pc.bgWhiteBright(string);
