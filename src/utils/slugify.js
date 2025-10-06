const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

const generateUniqueSlug = async (Model, baseSlug) => {
  let slug = baseSlug;
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const existing = await Model.findOne({ slug });

    if (!existing) {
      isUnique = true;
    } else {
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      slug = `${baseSlug}-${randomNum}`;
      counter++;

      if (counter > 10) {
        slug = `${baseSlug}-${Date.now()}`;
        isUnique = true;
      }
    }
  }

  return slug;
};

module.exports = {
  generateSlug,
  generateUniqueSlug,
};
