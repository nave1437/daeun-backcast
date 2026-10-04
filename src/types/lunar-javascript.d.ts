declare module "lunar-javascript" {
  export const Solar: {
    fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): {
      getLunar(): {
        getEightChar(): {
          setSect(sect: number): void;
          getYear(): string;
          getMonth(): string;
          getDay(): string;
          getTime(): string;
          getDayGan(): string;
          getYun(gender: number): {
            isForward(): boolean;
            getStartYear(): number;
            getDaYun(): Array<{
              getIndex(): number;
              getStartYear(): number;
              getEndYear(): number;
              getStartAge(): number;
              getGanZhi(): string;
            }>;
          };
        };
      };
    };
  };
}
