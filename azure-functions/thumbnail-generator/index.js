const sharp = require("sharp");

/**
 * Blob-trigger function.
 * Fires whenever a new image lands in the `entry-images` container
 * (i.e. right after a user attaches a photo to a post-it).
 * Skips anything that is already a thumbnail to avoid an infinite loop,
 * resizes to a 300px-wide post-it-sized preview, and writes it back to the
 * SAME container as `thumb-<original-name>` via the output binding.
 */
module.exports = async function (context, myBlob) {
  const blobName = context.bindingData.name;

  if (blobName.startsWith("thumb-")) {
    context.log(`Skipping ${blobName}, already a thumbnail`);
    return;
  }

  context.log(`Generating thumbnail for ${blobName} (${myBlob.length} bytes)`);

  const thumbnail = await sharp(myBlob)
    .resize({ width: 300, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  context.bindings.outputBlob = thumbnail;
  context.log(`Thumbnail written as thumb-${blobName}`);
};
