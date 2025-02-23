export const defineAPI = <
  T extends string,
  K extends (...arg: any[]) => Promise<any>
>(opt: {
  path: T;
  raw?: boolean;
  handler: K;
}) => {
  return opt;
};
