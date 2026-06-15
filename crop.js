const Jimp = require('jimp');

async function cropImage(path) {
  try {
    const image = await Jimp.read(path);
    image.autocrop();
    await image.writeAsync(path);
    console.log(`Cropped and saved: ${path}`);
  } catch (err) {
    console.error(`Error processing ${path}:`, err);
  }
}

async function main() {
  await cropImage('public/images/logo-light.png');
  await cropImage('public/images/logo-dark.png');
}

main();
