const fs = require("fs");
const puppeteer = require("puppeteer");

const lookUpMacmillan = async (word) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const userAgent =
    "Mozilla/5.0 (X11; Linux x86_64)" +
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36";
  await page.setUserAgent(userAgent);

  await page.setDefaultNavigationTimeout(0);
  await page.setViewport({
    width: 2000,
    height: 1250,
    deviceScaleFactor: 1,
  });

  await page.goto(
    `https://www.macmillandictionary.com/dictionary/british/${word}`
  );
  await page.waitForSelector(".search-input");
  await page.type(".search-input", `${word}`, { delay: 100 }); // Types slower, like a user
  console.log("it's working");
  await page.waitForSelector(".search-submit");
  const button = await page.$$(".search-submit");
  await button[1].click();
  await page.waitForNavigation();

  // ---------------------------------------------------------------------------------------------------------------------

  // GETTING RELATED ENTRIES

  console.log("Getting related entries");
  const getWordEntries = await page.evaluate((word) => {
    const relatedEntriesAll = document.querySelectorAll(
      ".related-entries-content"
    );
    
    if (relatedEntriesAll.item(1)) {
      const relatedEntriesItems = relatedEntriesAll
        .item(1)
        .querySelectorAll(".related-entries-item");
      const relatedEntriesArray = [];
      relatedEntriesItems.forEach((item) => {
        const entryLink = item.querySelector("a");
        const entry = item.querySelector(".BASE");
        const entrySecondary = item.querySelector(".PATTERNS-COLLOCATIONS");
        const POS = item.querySelector(".PART-OF-SPEECH");
        relatedEntriesArray.push({
          word: (entry) ? entry.innerHTML : entrySecondary.innerHTML,
          link: entryLink.href,
          POS: (POS) ? POS.innerText : null,
        });
      });
      const selectedEntries = [];
      for(const entry of relatedEntriesArray) {
        if(entry.word == word) {
          selectedEntries.push(entry)
        }
      }
      return (selectedEntries.length > 0) ? selectedEntries : "NO RELATED ENTRIES FOUND"
    } else {
      return "NO RELATED ENTRIES FOUND";
    }
  }, word);

  // console.log(getWordEntries);


  // ---------------------------------------------------------------------------------------------------------------------

  // GETTING WORD INFO

  console.log("Getting word info");
  const getWordInfo = await page.evaluate(() => {
    const wordTitleSelector = document.querySelector(".big-title .BASE");
    const wordّFormsSelector = document.querySelectorAll(".wordforms table tr");
    const wordّPOSSelector = document.querySelector(".PART-OF-SPEECH");

    const wordContent = {};

    wordContent.title = wordTitleSelector.innerText;

    if (wordّFormsSelector) {
      const wordForms = [];
      wordّFormsSelector.forEach((row) => {
        const entryType = row.querySelector(".INFLECTION-TYPE");
        const entryContent = row.querySelector(".INFLECTION-CONTENT");
        const entryForm = {};

        entryForm.inflectionType =
          entryType !== null ? entryType.innerText : null;
        entryForm.inflectionContent =
          entryContent !== null ? entryContent.innerText : null;

        wordForms.push(entryForm);
        wordContent.wordForms = wordForms;
      });
    }

    wordContent.POS = wordّPOSSelector.innerText;

    return wordContent;
  });

  const wordInfo = getWordInfo;
  // console.log(wordInfo);

  // ---------------------------------------------------------------------------------------------------------------------

  // GETTING (SHORT) DEFINITIONS LIST

  console.log("Getting short definitions list");

  const getShortWordDef = await page.evaluate(() => {
    const shortWordDef = document.querySelectorAll(".definitions-list li");
    if (!(shortWordDef.length === 0)) {
      const shortWordDefList = []
      shortWordDef.forEach((def) => {
        const shortDefinition = def.querySelector('a');
        if(!shortDefinition.innerText.includes('phras')) {
          shortWordDefList.push(shortDefinition.innerText)
        }
      })
      return shortWordDefList;
    } else {
      return 'NO SHORT DEFINITIONS FOUND'
    }
  })

  // console.log(getShortWordDef)

  // ---------------------------------------------------------------------------------------------------------------------

  // GETTING DEFINITIONS

  const getFullDefinitions = await page.evaluate(() => {
    const body = document.querySelector("body");
    const getMainDefs = body.querySelectorAll(".entry-sense");
    const allMainDefs = [];

    getMainDefs.forEach((defDiv) => {
      const mainDef = defDiv.querySelector(".SENSE-BODY");
      if (mainDef) {
        const devDivsMainEntry = {};
        const defNum = defDiv.querySelector(".SENSE-NUM");
        const defSyc = defDiv.querySelector(".SYNTAX-CODING");
        const defDef = defDiv.querySelector(".DEFINITION");
        const defExs = defDiv.querySelectorAll(".SENSE-CONTENT .EXAMPLES");
        devDivsMainEntry.num = defNum.innerText;
        devDivsMainEntry.syntaxCoding = defSyc ? defSyc.innerText : null;
        devDivsMainEntry.definition = defDef.innerText;

        if (defExs.length > 0) {
          const exArr = [];
          defExs.forEach((ex) => {
            const example = ex.querySelector(".EXAMPLE");
            exArr.push(example.innerText);
          });
          devDivsMainEntry.examples = exArr;
        } else {
          devDivsMainEntry.examples = null
        }

        const subDefArr = [];
        const subDefs = defDiv.querySelectorAll(".SUB-SENSE-BODY");
        if (subDefs.length > 0) {
          subDefs.forEach((subDef) => {
            const subDefObj = {};
            const subDefNum = subDef.querySelector(".SENSE-NUM");
            const subDefSyc = subDef.querySelector(".SYNTAX-CODING");
            const subDefDef = subDef.querySelector(".DEFINITION");
            const subDefExs = subDef.querySelectorAll(".EXAMPLES");
            subDefObj.num = subDefNum.innerText;
            subDefObj.syntaxCoding = subDefSyc ? subDefSyc.innerText : null;
            subDefObj.definition = subDefDef.innerText;
            if (subDefExs.length > 0) {
              const exSubDefArr = [];
              subDefExs.forEach((ex) => {
                const example = ex.querySelector(".EXAMPLE");
                exSubDefArr.push(example.innerText);
              });
              subDefObj.examples = exSubDefArr;
            }
            subDefArr.push(subDefObj);
          });
          devDivsMainEntry.subDefinitions = subDefArr;
        }
        allMainDefs.push(devDivsMainEntry);
      }
    });

    return allMainDefs;
  });

  // console.log(getFullDefinitions);

  
  // ---------------------------------------------------------------------------------------------------------------------

  // MAIN DEF OBJECT

  const objectDefs = {};

  objectDefs.WORDINFO = wordInfo;
  objectDefs.SHORTDEFINITIONS = getShortWordDef;
  objectDefs.MAINFULLDEFINITIONS = getFullDefinitions;
  objectDefs.RELATEDENTRIES = getWordEntries;

  console.log(objectDefs)


  // ---------------------------------------------------------------------------------------------------------------------

  // SAVING EVERYTHING TO FILE

  await fs.writeFile(
    `./${word}.json`,
    JSON.stringify(objectDefs),
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      //file written successfully
    }
  );

  console.log("Web scraping finished");
};

lookUpMacmillan("malice");
