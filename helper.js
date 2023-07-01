

/**
 * @description flatten verse objects from nested format to flat array
 * @param {array} verse - source array of nested verseObjects
 * @param {array} words - output array that will be filled with flattened verseObjects
 */

const flattenVerseObjects = ({ verseObjects = [], flat = [], origWords = [] }) => {
  let _verseObjects = [...verseObjects];
  while (_verseObjects.length > 0) {
    const object = _verseObjects.shift();
    if (object) {
      if (object.type === 'milestone') {
        origWords.push({ text: object.content, occurrence: object.occurrence, occurrences: object.occurrences })
        const _flat = flattenVerseObjects({ verseObjects: object.children, origWords });
        if (origWords.length > 1) {
          if (!_flat[0].hasOwnProperty('content')) {
            flat.push({ content: origWords, words: _flat });
          } else {
            flat.push(_flat[0])
          }
        } else {
          flat.push({ content: origWords, words: _flat });
        }
      } else {
        flat.push({ text: object.text, occurrence: object.occurrence, occurrences: object.occurrences });
        origWords = []
      }
    }
  }
  return flat;
};




module.exports.flattenVerseObjects = flattenVerseObjects;



