export async function delay(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}
