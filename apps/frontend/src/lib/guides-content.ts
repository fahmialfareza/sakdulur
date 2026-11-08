// Guides on family trees, in English and Indonesian: the public pages under /guides.
// What they say about Sakdulur must match the app (and /llms.txt). Keep both languages in step, and bump a
// guide's `updated` whenever its meaning changes.

import { BRAND } from "./brand";
import type { GuideSlug } from "./guides";

/** The example family's diagram (components/marketing/example-tree.tsx): its description and, per generation, a label and role. */
export type ExampleTreeFigure = { label: string; generations: [string, string][] };
export type GuideSection = {
  h: string;
  p?: string[];
  list?: string[];
  table?: { head: string[]; rows: string[][] };
  figure?: ExampleTreeFigure;
};
export type Guide = {
  slug: GuideSlug;
  title: string;
  /** Meta description and the summary on the guides index. */
  description: string;
  published: string;
  updated: string;
  intro: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
};

const PUBLISHED = "2026-11-01";
// Titles and descriptions retuned to the searches the guides were shown for (Search Console, first two weeks).
const RETUNED = "2026-11-09";

// Javanese generation names, the same word up (ancestors) and down (descendants) from you.
const javaneseGenerations = [
  ["1", "bapak / ibu (wong tuwa)", "anak"],
  ["2", "simbah, mbah, eyang", "putu"],
  ["3", "buyut", "buyut"],
  ["4", "canggah", "canggah"],
  ["5", "wareng", "wareng"],
  ["6", "udheg-udheg", "udheg-udheg"],
  ["7", "gantung siwur", "gantung siwur"],
  ["8", "gropak senthe", "gropak senthe"],
  ["9", "debog bosok", "debog bosok"],
  ["10", "galih asem", "galih asem"],
];

function guidesEn(): Guide[] {
  return [
    {
      slug: "cara-membuat-silsilah-keluarga",
      title: "How to make a family tree: a step-by-step guide",
      description:
        "A practical guide to making a family tree: what to collect, who to ask, how to record dates and places you only half know, and how to build it together with relatives.",
      published: PUBLISHED,
      updated: PUBLISHED,
      intro:
        "A family tree starts with what you already know and grows with every relative you ask. This guide walks through it step by step, from the first names on paper to a tree the whole family can see and add to.",
      sections: [
        {
          h: "1. Start with yourself and work backwards",
          p: [
            "Write down yourself, your siblings, your parents and your grandparents first: the people you know for sure. Then go one generation back at a time. Working from the known to the unknown keeps the tree correct; jumping to a famous ancestor and trying to connect down usually goes wrong.",
          ],
        },
        {
          h: "2. Collect the basics for each person",
          list: [
            "Full name, and other names people used (nicknames, names after marriage or the Hajj).",
            "Dates of birth and death. An approximate date (“about 1920”, “before 1950”) is far better than nothing.",
            "Places of birth, death and where they lived.",
            "Parents, partners (including earlier marriages) and children.",
            "Photos, and a few lines about who they were: work, stories, where they are buried.",
          ],
        },
        {
          h: "3. Ask the elders first",
          p: [
            "Grandparents, great-aunts and great-uncles carry knowledge that is written down nowhere. Visit or call them early, show them old photos, and ask about their own parents and grandparents. Record or note the answers the same day.",
            "Useful questions: Who were your parents and grandparents? Where did they live? How many siblings did they have, and who did each of them marry? Who in the family keeps old documents or photos?",
          ],
        },
        {
          h: "4. Check documents",
          p: [
            "Birth and marriage certificates, the family card (Kartu Keluarga), letters, gravestones, old photo captions and religious records confirm names and dates. Note where each fact came from, so that when two relatives disagree you can see which source is stronger.",
          ],
        },
        {
          h: "5. Record relationships exactly",
          p: [
            "Real families are not just father, mother and children. Record remarriages and divorces, half-siblings and step-siblings, and children who were adopted, fostered, raised by a guardian or nursed (milk kinship). Getting these right avoids confusion later, for example when someone asks how two cousins are actually related.",
          ],
        },
        {
          h: "6. Choose where to keep it",
          p: [
            "Paper and spreadsheets work for a few dozen people but get hard to keep current and to share. A family tree app keeps the layout tidy as the tree grows, and lets relatives see it and add their own branch.",
            `${BRAND} is a free, private family tree app for the web, iPhone, iPad, Android, Mac, Windows and Linux. Every tree is visible only to the people you invite. It handles couples side by side, remarriages, adoptive, step, foster, guardian and milk parents, approximate dates, places, photos and notes.`,
          ],
        },
        {
          h: "7. Build it together",
          p: [
            "Nobody knows every branch. Invite relatives as editors for the part of the family they know best, or as viewers if they only want to look. In Sakdulur you invite by email or with a link that expires, and with “Share by branch” each person only sees and edits the people shared with them.",
            "If the tree owner turns on the optional AI assistant, members can also ask questions (“Who is Ayu's father and where does he live?”) and editors can add relatives just by describing them; every change is shown first and saved only when they press Apply.",
          ],
        },
        {
          h: "8. Keep it alive",
          p: [
            "Add births, marriages and deaths as they happen, and print or export the tree for family gatherings. Sakdulur can print the tree or save it as a PDF or image, and owners can export it as Excel, GEDCOM or a full JSON backup at any time.",
          ],
        },
      ],
      faq: [
        {
          q: "What information do I need to start a family tree?",
          a: "Only names and how people are related. Dates, places, photos and stories can be added later, and approximate dates such as “about 1920” are fine.",
        },
        {
          q: "How many generations should a family tree have?",
          a: "Start with three or four generations (you, your parents, grandparents and great-grandparents) and extend it as relatives share more. There is no fixed limit.",
        },
        {
          q: "Is there a free app to make a family tree?",
          a: `Yes. ${BRAND} is free, has no ads, and works in the browser and as an app for iPhone, iPad, Android, Mac, Windows and Linux, in English and Bahasa Indonesia.`,
        },
      ],
    },
    {
      slug: "contoh-silsilah-keluarga",
      title: "Family tree example: a 4-generation chart and how to read it",
      description:
        "An example family tree chart over four generations, from great-grandparents to grandchildren, how to read it, the same family written as a numbered list, and what to record for each person.",
      published: RETUNED,
      updated: RETUNED,
      intro:
        "The quickest way to understand a family tree chart (bagan silsilah) is to read one. Below is an example family over four generations, how to read it, the same family written as a numbered list for a family book, and a template for your own.",
      sections: [
        {
          h: "1. Example: a 4-generation family tree",
          figure: {
            label:
              "Example family tree over four generations: Kromo Sentono and Painem; their son Hasan and his wife Siti; Hasan and Siti's sons Ahmad and Budi, with Ahmad's wife Dewi; and Ahmad and Dewi's children Rani and Bayu.",
            generations: [
              ["Generation 1", "great-grandparents"],
              ["Generation 2", "grandparents"],
              ["Generation 3", "parents"],
              ["Generation 4", "children"],
            ],
          },
          p: [
            "Kromo Sentono and Painem are the eldest couple. Their son Hasan married Siti; they had two sons, Ahmad and Budi. Ahmad married Dewi, and their children are Rani and Bayu. The table above names each generation as seen from Rani and Bayu (in Javanese, Kromo Sentono and Painem are their buyut).",
          ],
          table: {
            head: ["Person", "Generation", "Relation to Rani"],
            rows: [
              ["Kromo Sentono (1905–1978), Painem (1910–1985)", "1", "great-grandparents (Javanese: buyut)"],
              ["Hasan (1938–2011), Siti (1942–2019)", "2", "grandparents (Indonesian: kakek, nenek; Javanese: mbah, eyang)"],
              ["Ahmad (1965), Dewi (1968)", "3", "father and mother"],
              ["Budi (1966)", "3", "uncle: father's younger brother (Javanese: paklik)"],
              ["Bayu (1997)", "4", "younger brother (adik)"],
            ],
          },
        },
        {
          h: "2. How to read a family tree chart",
          list: [
            "Each row is one generation; the eldest is at the top.",
            "A couple sits side by side, joined by a line or a dot.",
            "Children hang from the line under their own parents, eldest usually first.",
            "Each box shows a name and years; a single year means the person is alive, two years are birth and death.",
            "Spouses who married into the family (like Siti and Dewi) have no line upward: their own parents belong to their own family's tree.",
          ],
        },
        {
          h: "3. Remarriages, adopted and step children",
          p: [
            "Real families are rarely this tidy. If Hasan had married twice, both wives would sit next to him and each child would hang under the right mother. Adopted, foster or step children hang under the parents who raised them, with the kind of parent noted, so nobody is left out or counted twice.",
          ],
        },
        {
          h: "4. The same family as a numbered list",
          p: [
            "For a family book or a trah reunion booklet, a silsilah is often written as a numbered list: each person gets the parent's number plus their own birth order, so the number shows the line of descent.",
          ],
          list: [
            "1. Kromo Sentono (1905–1978) + Painem (1910–1985)",
            "1.1. Hasan (1938–2011) + Siti (1942–2019)",
            "1.1.1. Ahmad (1965) + Dewi (1968)",
            "1.1.1.1. Rani (1994)",
            "1.1.1.2. Bayu (1997)",
            "1.1.2. Budi (1966)",
          ],
        },
        {
          h: "5. Template: what to record for each person",
          list: [
            "Full name and the name people used.",
            "Year or date of birth, and of death (an approximate year is fine).",
            "Place of birth and where they live or lived.",
            "Parents, and whether birth, adoptive, step or foster.",
            "Spouses, in order, with marriage (and divorce) years.",
            "Children, eldest first.",
            "A photo and a short note: work, stories, where they are buried.",
          ],
        },
        {
          h: "6. Make your own family tree chart",
          p: [
            `In ${BRAND} you add people and how they are related, and the chart is drawn for you: couples side by side, children under their own parents, generations in rows. Relatives can add their own branches, and you can print the tree, save it as a PDF or image, or export it as Excel or GEDCOM. It is free and private, in the browser or as an app.`,
          ],
        },
      ],
      faq: [
        {
          q: "What does a family tree chart contain?",
          a: "Names, birth and death years, and the lines that join couples and connect children to their parents, one generation per row. Photos, places and notes are optional.",
        },
        {
          q: "How many generations should a family tree example show?",
          a: "Three or four generations (great-grandparents down to the youngest children) is enough to show how a family tree works; real trees grow as relatives add more.",
        },
        {
          q: "How do I write a family tree as a list?",
          a: "Number the eldest couple 1, their children 1.1, 1.2 and so on, and each grandchild with the parent's number plus their own birth order (1.1.1). The number then shows the whole line of descent.",
        },
      ],
    },
    {
      slug: "trah-dan-bani",
      title: "Trah and bani: organizing a large extended-family tree",
      description:
        "How Indonesian extended families (a trah or bani) can build one shared family tree with hundreds of members: dividing the work by branch, keeping it private, and using it at reunions.",
      published: PUBLISHED,
      updated: PUBLISHED,
      intro:
        "In Indonesia many large families organize around a shared ancestor: a trah in Javanese families, a bani (from the Arabic for “children of”) in many Muslim families, such as “Bani Abdullah”. A shared family tree is often the first thing such a group wants, and also the hardest to keep complete. This guide shows how to organize one.",
      sections: [
        {
          h: "1. What a trah or bani is",
          p: [
            "A trah or bani is everyone descended from one ancestor couple, often five or more generations and hundreds of people, plus their spouses. Members meet at a yearly reunion, frequently a halal bihalal or syawalan after Eid, and many groups run an arisan or a family committee. Other communities have their own forms, such as the marga among the Batak.",
          ],
        },
        {
          h: "2. Agree on the root and the scope",
          p: [
            "Start from the founding ancestor couple (or several wives or husbands, if there were remarriages) and their children. Each child of the founder becomes a main branch. Decide early whether spouses' own families are included; usually only the spouse is recorded and their family stays in their own trah.",
          ],
        },
        {
          h: "3. Divide the work by branch",
          p: [
            "One person cannot know hundreds of relatives. Ask one contact per main branch, often the eldest grandchild or the most organized cousin, to collect and maintain their branch. A shared family tree app makes this easy: branch editors only need to know their own part.",
            "In Sakdulur the tree owner can turn on “Share by branch”, so each editor and viewer only sees and edits the people shared with them. Branch contacts are invited by email or with a link that expires.",
          ],
        },
        {
          h: "4. Record what reunions need",
          list: [
            "Who belongs to which branch, and the generation of each person (anak, putu, buyut, and so on; see the kinship terms guide).",
            "Where people live now, for invitations and to see who is nearby.",
            "Who has passed away, shown respectfully. Sakdulur can mark deceased relatives as Alm./Almh., with a cross, or with a neutral mark, depending on each person's religion.",
            "Marriages into the family, remarriages and adopted or fostered children, so nobody is left out.",
          ],
        },
        {
          h: "5. Keep it private",
          p: [
            "A trah tree is personal data about many people, including minors. Keep it in a private tree that only invited members can see, rather than a public website or an open spreadsheet link. Every tree in Sakdulur is private by default, and the data is never sold.",
          ],
        },
        {
          h: "6. Use it at the reunion",
          p: [
            "Print the whole tree, or one branch, for the reunion hall, or share it as an image in the family chat group. Sakdulur can print the tree, save it as a PDF or image, and export it as an Excel spreadsheet for the committee's lists.",
            "With the optional AI assistant turned on, members can ask questions such as “How is Rani related to Budi?” in Indonesian or English.",
          ],
        },
        {
          h: "7. Keep one family, many trees",
          p: [
            "Many people belong to several trah: their father's, their mother's and their spouse's. Keep a separate tree for each and copy a branch from one tree to another instead of typing it twice.",
          ],
        },
      ],
      faq: [
        {
          q: "What is the difference between a trah and a bani?",
          a: "Both mean everyone descended from one ancestor. Trah is the Javanese word; bani comes from Arabic (“children of”) and is common among Muslim families, usually followed by the ancestor's name, as in “Bani Abdullah”.",
        },
        {
          q: "How do you manage a family tree with hundreds of people?",
          a: "Divide it by branch: one contact per child of the founding ancestor maintains their own branch in a shared, private family tree app, and the whole tree is put together automatically.",
        },
        {
          q: "Can a trah family tree be printed for a reunion?",
          a: `Yes. ${BRAND} can print the whole tree or one branch, save it as a PDF or image, and export the list of members as an Excel spreadsheet.`,
        },
      ],
    },
    {
      slug: "istilah-kekerabatan",
      title: "Javanese generation names and Indonesian kinship terms (buyut, canggah, wareng, udheg-udheg)",
      description:
        "The Javanese generations in order: anak, putu, buyut, canggah, wareng, udheg-udheg, gantung siwur, gropak senthe, debog bosok, galih asem. Plus ipar, besan, pakdhe, misanan and other Indonesian family terms, with English equivalents.",
      published: PUBLISHED,
      updated: RETUNED,
      intro:
        "Indonesian and Javanese have their own words for relatives, and Javanese names every generation up to ten above and below you. This reference lists the common terms with their English equivalents, so you can label a family tree correctly.",
      sections: [
        {
          h: "1. Generations in Javanese",
          p: [
            "Javanese uses the same word for the ancestor and the descendant at the same distance: your buyut is your great-grandparent, and you are your great-grandparent's buyut. From the third generation on, the words are identical in both directions.",
          ],
          table: {
            head: ["Generation", "Up (ancestors)", "Down (descendants)"],
            rows: javaneseGenerations,
          },
        },
        {
          h: "2. The same generations in English and Indonesian",
          table: {
            head: ["Javanese", "Indonesian", "English"],
            rows: [
              ["anak", "anak", "child"],
              ["putu", "cucu", "grandchild"],
              ["mbah, eyang", "kakek, nenek", "grandfather, grandmother"],
              ["buyut", "buyut; cicit (downward)", "great-grandparent; great-grandchild"],
              ["canggah", "canggah; piut (downward)", "great-great-grandparent; great-great-grandchild"],
              ["wareng", "wareng", "3× great-grandparent or grandchild"],
              ["udheg-udheg", "udheg-udheg", "4× great-grandparent or grandchild"],
              ["gantung siwur", "gantung siwur", "5× great-grandparent or grandchild"],
            ],
          },
          p: [
            "Everyday Indonesian mostly stops at buyut and cicit; beyond that people say leluhur or nenek moyang (ancestors) and keturunan (descendants), or borrow the Javanese words. Spelling and the order of the furthest generations vary by region.",
          ],
        },
        {
          h: "3. Siblings, uncles, aunts and cousins",
          table: {
            head: ["Indonesian", "Javanese", "English"],
            rows: [
              ["kakak / adik", "mas, mbak (kangmas, mbakyu) / adhi", "older / younger sibling"],
              ["saudara kandung", "sedulur sekandung", "full sibling"],
              ["paman, om / bibi, tante", "pakdhe, budhe (parent's older sibling); paklik, bulik (parent's younger sibling)", "uncle / aunt"],
              ["sepupu", "sedulur misanan (misan)", "first cousin"],
              ["sepupu dua kali", "sedulur mindhoan (mindho)", "second cousin"],
              ["sepupu tiga kali", "sedulur mentelu", "third cousin"],
              ["keponakan", "ponakan", "nephew / niece"],
            ],
          },
          p: [
            "Pakdhe and budhe are also used for the spouses of a parent's older siblings, and paklik and bulik for the spouses of their younger siblings. Whether an uncle is pakdhe or paklik depends on his age relative to your parent, not to you.",
          ],
        },
        {
          h: "4. Relatives by marriage",
          table: {
            head: ["Indonesian", "Javanese", "English"],
            rows: [
              ["suami / istri", "bojo, garwa", "husband / wife"],
              ["mertua", "maratuwa", "parent-in-law"],
              ["menantu", "mantu", "son- or daughter-in-law"],
              ["ipar", "ipe", "brother- or sister-in-law"],
              ["besan", "besan", "the parents of your child's spouse"],
            ],
          },
          p: ["Besan has no single English word: it is the relationship between two sets of parents whose children married each other."],
        },
        {
          h: "5. Kinds of parents and children",
          table: {
            head: ["Indonesian", "English", "Meaning"],
            rows: [
              ["kandung", "birth", "biological parent or child"],
              ["angkat", "adoptive", "adopted into the family"],
              ["tiri", "step", "the child or parent of a spouse from another marriage"],
              ["asuh", "foster", "raised by the family without adoption"],
              ["wali", "guardian", "legal or customary guardian"],
              ["susuan", "milk", "milk kinship: nursed by the same woman, recognized in Islam"],
            ],
          },
          p: [
            `${BRAND} records each of these parent kinds, and groups siblings as full, half, step or foster. The app is available in Indonesian and English.`,
          ],
        },
      ],
      faq: [
        {
          q: "What comes after buyut?",
          a: "In Javanese: buyut (3rd generation), canggah (4th), wareng (5th), udheg-udheg (6th), gantung siwur (7th), gropak senthe (8th), debog bosok (9th) and galih asem (10th). The same words are used for ancestors and descendants.",
        },
        {
          q: "What is the difference between pakdhe and paklik?",
          a: "Pakdhe is your parent's older brother (or the husband of their older sister); paklik is your parent's younger brother (or the husband of their younger sister). Budhe and bulik are the female equivalents.",
        },
        {
          q: "What does besan mean?",
          a: "Besan are the parents of your child's spouse: when two children marry, their parents become each other's besan.",
        },
        {
          q: "What is a cicit?",
          a: "Cicit is the Indonesian word for a great-grandchild, the child of your grandchild. In Javanese the same person is your buyut.",
        },
      ],
    },
    {
      slug: "gedcom",
      title: "What is a GEDCOM (.ged) file? How to export a family tree to GEDCOM",
      description:
        "A GEDCOM (.ged) file is the standard format for moving a family tree between genealogy apps such as MyHeritage, Ancestry, FamilySearch and Gramps. What it contains, and how to export your tree as GEDCOM, Excel or JSON.",
      published: PUBLISHED,
      updated: RETUNED,
      intro:
        "GEDCOM (GEnealogical Data COMmunication) is the common file format of family tree software. A .ged file holds people, families and how they are related, so a tree made in one app can be opened in another. This guide explains what it contains and how to export your tree.",
      sections: [
        {
          h: "1. What a GEDCOM file contains",
          list: [
            "People (INDI records): names, sex, birth and death dates and places, and notes.",
            "Families (FAM records): a couple and their children, with marriage and divorce events.",
            "How children are linked to parents, including adopted and foster children.",
            "Approximate dates written as ABT (about), BEF (before) or AFT (after).",
          ],
          p: [
            "GEDCOM 5.5.1 is the version almost every genealogy app reads, including MyHeritage, Ancestry, FamilySearch and Gramps. It is a plain text file, so it is also a durable archive of your research.",
          ],
        },
        {
          h: "2. When to use GEDCOM",
          list: [
            "To move or copy your tree to another genealogy app or website.",
            "To keep an independent backup in an open format.",
            "To share your research with a relative who uses different software.",
          ],
        },
        {
          h: "3. Exporting from Sakdulur",
          p: [
            `In ${BRAND}, open the tree, go to its settings and choose Export. Pick the whole tree or one branch (a person and their descendants, their ancestors, both, or the relatives a few steps around them), then choose a format:`,
          ],
          list: [
            "GEDCOM (5.5.1): for MyHeritage, Ancestry, FamilySearch, Gramps and other family tree apps.",
            "Spreadsheet (Excel): one row per person; opens in Excel, Google Sheets or WPS.",
            "Full backup (JSON): everything Sakdulur stores about the tree.",
            "Image (PNG) or Print / save as PDF: a picture of the tree to share or print.",
          ],
        },
        {
          h: "4. Good to know",
          p: [
            "Files (GEDCOM, Excel and JSON) can be downloaded by the tree's owners; every member can save or print the tree as a picture. GEDCOM 5.5.1 has no code for every relationship type, so step, guardian and milk parents are exported as parent links with a note naming the kind, and some details may look different after importing into another app. Sakdulur does not import GEDCOM files.",
          ],
        },
      ],
      faq: [
        {
          q: "What is a .ged file?",
          a: "A .ged file is a GEDCOM file: a plain text file with the people, families and relationships of a family tree, readable by almost every genealogy app.",
        },
        {
          q: "Can I export my family tree from Sakdulur?",
          a: "Yes. Tree owners can export the whole tree or one branch as GEDCOM, an Excel spreadsheet or a full JSON backup, and anyone in the tree can print it or save it as an image.",
        },
        {
          q: "Which apps can open a GEDCOM file?",
          a: "Almost all genealogy apps and websites, including MyHeritage, Ancestry, FamilySearch and Gramps.",
        },
      ],
    },
  ];
}

function guidesId(): Guide[] {
  return [
    {
      slug: "cara-membuat-silsilah-keluarga",
      title: "Cara membuat silsilah keluarga (pohon keluarga): langkah mudah untuk pemula",
      description:
        "Cara membuat silsilah keluarga dalam 8 langkah: mulai dari diri sendiri, kumpulkan nama, tanggal, dan tempat, tanyakan kepada sesepuh, catat hubungan dengan tepat, lalu susun pohon keluarga bersama kerabat.",
      published: PUBLISHED,
      updated: RETUNED,
      intro:
        "Silsilah keluarga berawal dari apa yang sudah Anda ketahui dan bertambah setiap kali Anda bertanya kepada kerabat. Panduan ini membahasnya langkah demi langkah, dari nama-nama pertama di kertas hingga pohon keluarga yang bisa dilihat dan dilengkapi seluruh keluarga.",
      sections: [
        {
          h: "1. Mulai dari diri sendiri, lalu mundur ke atas",
          p: [
            "Tulis dulu diri Anda, saudara kandung, orang tua, dan kakek-nenek: orang-orang yang Anda ketahui pasti. Lalu mundur satu generasi demi satu generasi. Bergerak dari yang pasti ke yang belum diketahui membuat silsilah tetap benar; melompat ke leluhur yang terkenal lalu mencoba menyambung ke bawah biasanya keliru.",
          ],
        },
        {
          h: "2. Kumpulkan data dasar setiap orang",
          list: [
            "Nama lengkap, dan nama lain yang pernah dipakai (nama panggilan, nama setelah menikah atau berhaji).",
            "Tanggal lahir dan wafat. Tanggal perkiraan (“sekitar 1920”, “sebelum 1950”) jauh lebih baik daripada kosong.",
            "Tempat lahir, tempat wafat, dan tempat tinggal.",
            "Orang tua, pasangan (termasuk pernikahan sebelumnya), dan anak.",
            "Foto, dan beberapa kalimat tentang siapa dia: pekerjaan, kisah, tempat dimakamkan.",
          ],
        },
        {
          h: "3. Tanyakan kepada para sesepuh lebih dulu",
          p: [
            "Kakek, nenek, mbah, pakdhe, dan budhe menyimpan pengetahuan yang tidak tertulis di mana pun. Kunjungi atau telepon mereka sedini mungkin, tunjukkan foto lama, dan tanyakan tentang orang tua dan kakek-nenek mereka. Catat atau rekam jawabannya hari itu juga.",
            "Pertanyaan yang berguna: Siapa orang tua dan kakek-nenek Mbah? Dulu tinggal di mana? Berapa saudaranya, dan masing-masing menikah dengan siapa? Siapa di keluarga yang menyimpan dokumen atau foto lama?",
          ],
        },
        {
          h: "4. Periksa dokumen",
          p: [
            "Akta kelahiran, buku nikah, Kartu Keluarga, surat-surat, batu nisan, keterangan di balik foto lama, dan catatan keagamaan bisa memastikan nama dan tanggal. Catat sumber setiap fakta, supaya ketika dua kerabat berbeda pendapat Anda bisa melihat sumber mana yang lebih kuat.",
          ],
        },
        {
          h: "5. Catat hubungan dengan tepat",
          p: [
            "Keluarga sebenarnya bukan hanya ayah, ibu, dan anak. Catat pernikahan kedua dan perceraian, saudara seayah atau seibu dan saudara tiri, serta anak angkat, anak asuh, anak yang diasuh wali, dan saudara sesusuan. Mencatatnya dengan benar mencegah kebingungan, misalnya saat ada yang bertanya bagaimana dua sepupu sebenarnya bersaudara.",
          ],
        },
        {
          h: "6. Pilih tempat menyimpannya",
          p: [
            "Kertas dan spreadsheet cukup untuk beberapa puluh orang, tetapi sulit diperbarui dan dibagikan. Aplikasi silsilah keluarga menjaga tampilan tetap rapi saat pohon bertambah besar, dan memungkinkan kerabat melihat serta menambahkan cabangnya sendiri.",
            `${BRAND} adalah aplikasi silsilah keluarga yang gratis dan privat untuk web, iPhone, iPad, Android, Mac, Windows, dan Linux. Setiap pohon hanya bisa dilihat oleh orang yang Anda undang. Pasangan ditampilkan berdampingan, dan aplikasi ini mendukung pernikahan kedua; orang tua kandung, angkat, tiri, asuh, wali, dan susuan; tanggal perkiraan; tempat; foto; dan catatan.`,
          ],
        },
        {
          h: "7. Susun bersama",
          p: [
            "Tidak ada yang tahu semua cabang. Undang kerabat sebagai editor untuk bagian keluarga yang paling mereka kenal, atau sebagai pembaca jika hanya ingin melihat. Di Sakdulur, undangan dikirim lewat email atau tautan yang punya masa berlaku, dan dengan “Berbagi per cabang” setiap orang hanya melihat dan mengubah orang-orang yang dibagikan kepadanya.",
            "Jika pemilik pohon mengaktifkan asisten AI (opsional), anggota juga bisa bertanya (“Bapaknya Ayu siapa dan tinggal di mana?”) dan editor bisa menambahkan kerabat cukup dengan menceritakannya; setiap perubahan ditampilkan dulu dan baru tersimpan setelah menekan Terapkan.",
          ],
        },
        {
          h: "8. Terus perbarui",
          p: [
            "Tambahkan kelahiran, pernikahan, dan kematian saat terjadi, lalu cetak atau ekspor silsilah untuk acara keluarga. Sakdulur bisa mencetak pohon atau menyimpannya sebagai PDF atau gambar, dan pemilik bisa mengekspornya sebagai Excel, GEDCOM, atau cadangan JSON lengkap kapan saja.",
          ],
        },
      ],
      faq: [
        {
          q: "Data apa yang dibutuhkan untuk membuat silsilah keluarga?",
          a: "Cukup nama dan hubungan antarorang. Tanggal, tempat, foto, dan kisah bisa ditambahkan belakangan, dan tanggal perkiraan seperti “sekitar 1920” pun tidak masalah.",
        },
        {
          q: "Berapa generasi yang sebaiknya ada di silsilah keluarga?",
          a: "Mulailah dengan tiga atau empat generasi (Anda, orang tua, kakek-nenek, dan buyut), lalu kembangkan seiring kerabat berbagi cerita. Tidak ada batas pasti.",
        },
        {
          q: "Apakah ada aplikasi gratis untuk membuat silsilah keluarga?",
          a: `Ada. ${BRAND} gratis, tanpa iklan, dan bisa dipakai di browser maupun sebagai aplikasi iPhone, iPad, Android, Mac, Windows, dan Linux, dalam Bahasa Indonesia dan Inggris.`,
        },
      ],
    },
    {
      slug: "contoh-silsilah-keluarga",
      title: "Contoh silsilah keluarga: bagan 4 generasi dan cara membacanya",
      description:
        "Contoh bagan silsilah keluarga 4 generasi, dari buyut sampai cucu, cara membacanya, contoh silsilah dalam bentuk daftar bernomor, dan data yang perlu dicatat untuk setiap orang.",
      published: RETUNED,
      updated: RETUNED,
      intro:
        "Cara paling cepat memahami bagan silsilah keluarga adalah dengan membaca contohnya. Di bawah ini ada contoh keluarga empat generasi, cara membacanya, keluarga yang sama dalam bentuk daftar bernomor untuk buku keluarga, dan templat untuk silsilah Anda sendiri.",
      sections: [
        {
          h: "1. Contoh bagan silsilah keluarga 4 generasi",
          figure: {
            label:
              "Contoh silsilah keluarga empat generasi: Kromo Sentono dan Painem; anak mereka Hasan dan istrinya Siti; anak Hasan dan Siti, yaitu Ahmad dan Budi, serta istri Ahmad, Dewi; dan anak Ahmad dan Dewi, yaitu Rani dan Bayu.",
            generations: [
              ["Generasi 1", "buyut"],
              ["Generasi 2", "kakek, nenek (mbah)"],
              ["Generasi 3", "bapak, ibu"],
              ["Generasi 4", "anak"],
            ],
          },
          p: [
            "Kromo Sentono dan Painem adalah pasangan tertua. Anak mereka, Hasan, menikah dengan Siti dan punya dua anak laki-laki, Ahmad dan Budi. Ahmad menikah dengan Dewi, dan anak mereka adalah Rani dan Bayu. Tabel di atas menunjukkan sebutan setiap generasi dilihat dari Rani dan Bayu.",
          ],
          table: {
            head: ["Orang", "Generasi", "Hubungan dengan Rani"],
            rows: [
              ["Kromo Sentono (1905–1978), Painem (1910–1985)", "1", "buyut (kakek dan nenek buyut)"],
              ["Hasan (1938–2011), Siti (1942–2019)", "2", "kakek dan nenek (mbah, eyang)"],
              ["Ahmad (1965), Dewi (1968)", "3", "bapak dan ibu"],
              ["Budi (1966)", "3", "paman, adik bapak (paklik, om)"],
              ["Bayu (1997)", "4", "adik"],
            ],
          },
        },
        {
          h: "2. Cara membaca bagan silsilah keluarga",
          list: [
            "Setiap baris adalah satu generasi; yang tertua di paling atas.",
            "Pasangan suami istri berdampingan, dihubungkan dengan garis atau titik.",
            "Anak-anak bergantung pada garis di bawah orang tuanya sendiri, biasanya dari yang tertua.",
            "Setiap kotak berisi nama dan tahun; satu tahun berarti masih hidup, dua tahun berarti tahun lahir dan wafat.",
            "Menantu yang masuk ke keluarga (seperti Siti dan Dewi) tidak punya garis ke atas: orang tua mereka masuk silsilah keluarganya sendiri.",
          ],
        },
        {
          h: "3. Pernikahan kedua, anak angkat, dan anak tiri",
          p: [
            "Keluarga sebenarnya jarang serapi ini. Jika Hasan menikah dua kali, kedua istrinya berada di sampingnya dan setiap anak bergantung di bawah ibunya masing-masing. Anak angkat, anak asuh, atau anak tiri bergantung di bawah orang tua yang membesarkannya, dengan jenis hubungannya dicatat, supaya tidak ada yang terlewat atau tercatat dua kali.",
          ],
        },
        {
          h: "4. Contoh silsilah dalam bentuk daftar bernomor",
          p: [
            "Untuk buku keluarga atau buku pertemuan trah, silsilah sering ditulis sebagai daftar bernomor: setiap orang mendapat nomor orang tuanya ditambah urutan kelahirannya, sehingga nomornya menunjukkan garis keturunan.",
          ],
          list: [
            "1. Kromo Sentono (1905–1978) + Painem (1910–1985)",
            "1.1. Hasan (1938–2011) + Siti (1942–2019)",
            "1.1.1. Ahmad (1965) + Dewi (1968)",
            "1.1.1.1. Rani (1994)",
            "1.1.1.2. Bayu (1997)",
            "1.1.2. Budi (1966)",
          ],
        },
        {
          h: "5. Templat: data yang dicatat untuk setiap orang",
          list: [
            "Nama lengkap dan nama panggilan.",
            "Tahun atau tanggal lahir, dan wafat (tahun perkiraan pun tidak apa-apa).",
            "Tempat lahir dan tempat tinggal.",
            "Orang tua, serta jenisnya: kandung, angkat, tiri, atau asuh.",
            "Pasangan, berurutan, dengan tahun menikah (dan bercerai).",
            "Anak-anak, dari yang tertua.",
            "Foto dan catatan singkat: pekerjaan, kisah, tempat dimakamkan.",
          ],
        },
        {
          h: "6. Buat bagan silsilah keluarga Anda sendiri",
          p: [
            `Di ${BRAND}, Anda cukup menambahkan orang dan hubungannya, dan bagannya tersusun sendiri: pasangan berdampingan, anak di bawah orang tuanya, setiap generasi dalam satu baris. Kerabat bisa menambahkan cabangnya sendiri, dan pohonnya bisa dicetak, disimpan sebagai PDF atau gambar, atau diekspor sebagai Excel atau GEDCOM. Gratis dan privat, di browser maupun sebagai aplikasi.`,
          ],
        },
      ],
      faq: [
        {
          q: "Apa isi bagan silsilah keluarga?",
          a: "Nama, tahun lahir dan wafat, serta garis yang menghubungkan pasangan dan menghubungkan anak dengan orang tuanya, satu generasi per baris. Foto, tempat, dan catatan bersifat tambahan.",
        },
        {
          q: "Berapa generasi yang sebaiknya ada di contoh silsilah keluarga?",
          a: "Tiga atau empat generasi (dari buyut sampai anak-anak termuda) sudah cukup untuk menunjukkan cara kerja silsilah; silsilah sebenarnya bertambah seiring kerabat melengkapinya.",
        },
        {
          q: "Bagaimana cara menulis silsilah keluarga dalam bentuk daftar?",
          a: "Beri nomor 1 untuk pasangan tertua, 1.1, 1.2, dan seterusnya untuk anak-anaknya, lalu setiap cucu mendapat nomor orang tuanya ditambah urutan kelahirannya (1.1.1). Nomor itu menunjukkan seluruh garis keturunan.",
        },
        {
          q: "Bagaimana membuat bagan silsilah keluarga di HP?",
          a: `Pakai ${BRAND} di browser ponsel mana pun, atau pasang aplikasinya. Tambahkan orang dan hubungannya, dan bagannya tersusun sendiri; hasilnya bisa disimpan sebagai gambar atau PDF untuk dibagikan.`,
        },
      ],
    },
    {
      slug: "trah-dan-bani",
      title: "Trah dan bani: cara menyusun silsilah keluarga besar",
      description:
        "Cara keluarga besar (trah atau bani) menyusun satu silsilah bersama dengan ratusan anggota: membagi tugas per cabang, menjaga privasi, dan memakainya saat halal bihalal atau pertemuan trah.",
      published: PUBLISHED,
      updated: PUBLISHED,
      intro:
        "Banyak keluarga besar di Indonesia berkumpul di bawah satu leluhur: trah di keluarga Jawa, atau bani (dari bahasa Arab, “anak-anak dari”) di banyak keluarga Muslim, seperti “Bani Abdullah”. Silsilah bersama sering menjadi hal pertama yang diinginkan, sekaligus yang paling sulit dilengkapi. Panduan ini menunjukkan cara menyusunnya.",
      sections: [
        {
          h: "1. Apa itu trah atau bani",
          p: [
            "Trah atau bani adalah seluruh keturunan dari satu pasangan leluhur, sering lima generasi atau lebih dan ratusan orang, beserta pasangannya. Anggotanya bertemu dalam pertemuan tahunan, sering berupa halal bihalal atau syawalan setelah Lebaran, dan banyak yang punya arisan atau paguyuban keluarga. Komunitas lain punya bentuknya sendiri, misalnya marga di masyarakat Batak.",
          ],
        },
        {
          h: "2. Sepakati akar dan cakupannya",
          p: [
            "Mulailah dari pasangan leluhur pendiri (atau beberapa istri atau suami, jika ada pernikahan kedua) dan anak-anaknya. Setiap anak leluhur menjadi cabang utama. Putuskan sejak awal apakah keluarga dari pihak pasangan ikut dicatat; biasanya hanya pasangannya yang dicatat, sedangkan keluarganya masuk trah mereka sendiri.",
          ],
        },
        {
          h: "3. Bagi tugas per cabang",
          p: [
            "Satu orang tidak mungkin mengenal ratusan kerabat. Tunjuk satu penghubung untuk setiap cabang utama, sering cucu tertua atau sepupu yang paling rapi, untuk mengumpulkan dan merawat data cabangnya. Aplikasi silsilah bersama memudahkan ini: editor cabang cukup mengenal bagiannya sendiri.",
            "Di Sakdulur, pemilik pohon bisa mengaktifkan “Berbagi per cabang”, sehingga setiap editor dan pembaca hanya melihat dan mengubah orang yang dibagikan kepadanya. Penghubung cabang diundang lewat email atau tautan yang punya masa berlaku.",
          ],
        },
        {
          h: "4. Catat yang dibutuhkan saat pertemuan",
          list: [
            "Siapa masuk cabang mana, dan generasi setiap orang (anak, putu, buyut, dan seterusnya; lihat panduan istilah kekerabatan).",
            "Tempat tinggal sekarang, untuk undangan dan untuk melihat siapa yang berdekatan.",
            "Siapa yang sudah wafat, ditampilkan dengan hormat. Sakdulur bisa menandai kerabat yang wafat dengan Alm./Almh., tanda salib, atau tanda netral, sesuai agama masing-masing.",
            "Menantu yang masuk keluarga, pernikahan kedua, serta anak angkat atau anak asuh, supaya tidak ada yang terlewat.",
          ],
        },
        {
          h: "5. Jaga privasinya",
          p: [
            "Silsilah trah berisi data pribadi banyak orang, termasuk anak-anak. Simpan di pohon privat yang hanya bisa dilihat anggota yang diundang, bukan di situs publik atau tautan spreadsheet yang terbuka. Setiap pohon di Sakdulur privat sejak awal, dan data tidak pernah dijual.",
          ],
        },
        {
          h: "6. Pakai saat pertemuan trah",
          p: [
            "Cetak seluruh pohon atau satu cabang untuk dipajang di tempat acara, atau bagikan sebagai gambar di grup WhatsApp keluarga. Sakdulur bisa mencetak pohon, menyimpannya sebagai PDF atau gambar, dan mengekspornya sebagai spreadsheet Excel untuk daftar panitia.",
            "Jika asisten AI diaktifkan, anggota bisa bertanya seperti “Rani dan Budi itu saudara dari mana?” dalam bahasa Indonesia atau Inggris.",
          ],
        },
        {
          h: "7. Satu keluarga, banyak pohon",
          p: [
            "Banyak orang termasuk beberapa trah sekaligus: dari pihak ayah, ibu, dan pasangan. Simpan pohon terpisah untuk masing-masing dan salin satu cabang dari pohon satu ke pohon lain tanpa mengetik ulang.",
          ],
        },
      ],
      faq: [
        {
          q: "Apa bedanya trah dan bani?",
          a: "Keduanya berarti seluruh keturunan dari satu leluhur. Trah adalah istilah Jawa; bani berasal dari bahasa Arab (“anak-anak dari”) dan lazim di keluarga Muslim, biasanya diikuti nama leluhurnya, seperti “Bani Abdullah”.",
        },
        {
          q: "Bagaimana mengelola silsilah keluarga dengan ratusan anggota?",
          a: "Bagi per cabang: satu penghubung untuk setiap anak leluhur pendiri merawat cabangnya sendiri di aplikasi silsilah yang privat dan dipakai bersama, dan seluruh pohon tersusun dengan sendirinya.",
        },
        {
          q: "Bisakah silsilah trah dicetak untuk acara keluarga?",
          a: `Bisa. ${BRAND} bisa mencetak seluruh pohon atau satu cabang, menyimpannya sebagai PDF atau gambar, dan mengekspor daftar anggota sebagai spreadsheet Excel.`,
        },
      ],
    },
    {
      slug: "istilah-kekerabatan",
      title: "Urutan silsilah Jawa dan istilah kekerabatan: anak, putu, buyut, canggah, wareng, udheg-udheg",
      description:
        "Urutan generasi dalam bahasa Jawa: anak, putu, buyut, canggah, wareng, udheg-udheg, gantung siwur, gropak senthe, debog bosok, galih asem. Lengkap dengan arti ipar, besan, pakdhe, misanan, dan istilah keluarga lainnya.",
      published: PUBLISHED,
      updated: RETUNED,
      intro:
        "Bahasa Indonesia dan bahasa Jawa punya sebutan sendiri untuk kerabat, dan bahasa Jawa menamai setiap generasi hingga sepuluh tingkat ke atas dan ke bawah. Rujukan ini memuat istilah yang umum beserta padanan bahasa Inggrisnya, supaya silsilah keluarga bisa diberi keterangan dengan tepat.",
      sections: [
        {
          h: "1. Urutan generasi dalam bahasa Jawa",
          p: [
            "Bahasa Jawa memakai kata yang sama untuk leluhur dan keturunan pada jarak yang sama: buyut Anda adalah orang tua kakek-nenek Anda, dan Anda adalah buyut bagi mereka. Mulai generasi ketiga, sebutannya sama ke atas maupun ke bawah.",
          ],
          table: {
            head: ["Generasi", "Ke atas (leluhur)", "Ke bawah (keturunan)"],
            rows: javaneseGenerations,
          },
        },
        {
          h: "2. Padanan dalam bahasa Indonesia dan Inggris",
          table: {
            head: ["Jawa", "Indonesia", "Inggris"],
            rows: [
              ["anak", "anak", "child"],
              ["putu", "cucu", "grandchild"],
              ["mbah, eyang", "kakek, nenek", "grandfather, grandmother"],
              ["buyut", "buyut; cicit (ke bawah)", "great-grandparent; great-grandchild"],
              ["canggah", "canggah; piut (ke bawah)", "great-great-grandparent; great-great-grandchild"],
              ["wareng", "wareng", "3× great-grandparent / grandchild"],
              ["udheg-udheg", "udheg-udheg", "4× great-grandparent / grandchild"],
              ["gantung siwur", "gantung siwur", "5× great-grandparent / grandchild"],
            ],
          },
          p: [
            "Bahasa Indonesia sehari-hari umumnya berhenti di buyut dan cicit; selebihnya orang menyebut leluhur atau nenek moyang dan keturunan, atau memakai istilah Jawa. Ejaan dan urutan generasi yang paling jauh bisa berbeda antardaerah.",
          ],
        },
        {
          h: "3. Saudara, paman, bibi, dan sepupu",
          table: {
            head: ["Indonesia", "Jawa", "Inggris"],
            rows: [
              ["kakak / adik", "mas, mbak (kangmas, mbakyu) / adhi", "older / younger sibling"],
              ["saudara kandung", "sedulur sekandung", "full sibling"],
              ["paman, om / bibi, tante", "pakdhe, budhe (kakak orang tua); paklik, bulik (adik orang tua)", "uncle / aunt"],
              ["sepupu", "sedulur misanan (misan)", "first cousin"],
              ["sepupu dua kali", "sedulur mindhoan (mindho)", "second cousin"],
              ["sepupu tiga kali", "sedulur mentelu", "third cousin"],
              ["keponakan", "ponakan", "nephew / niece"],
            ],
          },
          p: [
            "Pakdhe dan budhe juga dipakai untuk pasangan kakak orang tua, dan paklik serta bulik untuk pasangan adik orang tua. Apakah seorang paman disebut pakdhe atau paklik bergantung pada umurnya dibanding orang tua Anda, bukan dibanding Anda.",
          ],
        },
        {
          h: "4. Kerabat karena pernikahan",
          table: {
            head: ["Indonesia", "Jawa", "Inggris"],
            rows: [
              ["suami / istri", "bojo, garwa", "husband / wife"],
              ["mertua", "maratuwa", "parent-in-law"],
              ["menantu", "mantu", "son- / daughter-in-law"],
              ["ipar", "ipe", "brother- / sister-in-law"],
              ["besan", "besan", "the parents of your child's spouse"],
            ],
          },
          p: ["Besan tidak punya padanan satu kata dalam bahasa Inggris: itulah hubungan antara dua pasang orang tua yang anaknya saling menikah."],
        },
        {
          h: "5. Jenis orang tua dan anak",
          table: {
            head: ["Indonesia", "Inggris", "Arti"],
            rows: [
              ["kandung", "birth", "orang tua atau anak biologis"],
              ["angkat", "adoptive", "diangkat menjadi anggota keluarga"],
              ["tiri", "step", "anak atau orang tua pasangan dari pernikahan lain"],
              ["asuh", "foster", "diasuh keluarga tanpa pengangkatan"],
              ["wali", "guardian", "wali secara hukum atau adat"],
              ["susuan", "milk", "saudara sesusuan: disusui oleh perempuan yang sama, diakui dalam Islam"],
            ],
          },
          p: [
            `${BRAND} mencatat setiap jenis orang tua ini, dan mengelompokkan saudara sebagai kandung, seayah/seibu, tiri, atau asuh. Aplikasinya tersedia dalam bahasa Indonesia dan Inggris.`,
          ],
        },
      ],
      faq: [
        {
          q: "Setelah buyut apa?",
          a: "Dalam bahasa Jawa: buyut (generasi ke-3), canggah (ke-4), wareng (ke-5), udheg-udheg (ke-6), gantung siwur (ke-7), gropak senthe (ke-8), debog bosok (ke-9), dan galih asem (ke-10). Sebutan yang sama dipakai untuk leluhur maupun keturunan.",
        },
        {
          q: "Apa bedanya pakdhe dan paklik?",
          a: "Pakdhe adalah kakak laki-laki orang tua Anda (atau suami dari kakak perempuannya); paklik adalah adik laki-laki orang tua Anda (atau suami dari adik perempuannya). Budhe dan bulik adalah sebutan untuk perempuan.",
        },
        {
          q: "Apa arti besan?",
          a: "Besan adalah orang tua dari pasangan anak Anda: ketika dua anak menikah, orang tua mereka saling menjadi besan.",
        },
        {
          q: "Apa itu cicit?",
          a: "Cicit adalah anak dari cucu. Dalam bahasa Jawa, orang yang sama disebut buyut.",
        },
      ],
    },
    {
      slug: "gedcom",
      title: "Apa itu file GEDCOM (.ged)? Cara ekspor silsilah keluarga",
      description:
        "File GEDCOM (.ged) adalah format standar untuk memindahkan silsilah keluarga antaraplikasi seperti MyHeritage, Ancestry, FamilySearch, dan Gramps. Isinya, dan cara mengekspor pohon sebagai GEDCOM, Excel, atau JSON.",
      published: PUBLISHED,
      updated: RETUNED,
      intro:
        "GEDCOM (GEnealogical Data COMmunication) adalah format file yang dipakai bersama oleh aplikasi silsilah. File .ged berisi orang, keluarga, dan hubungan di antara mereka, sehingga silsilah yang dibuat di satu aplikasi bisa dibuka di aplikasi lain. Panduan ini menjelaskan isinya dan cara mengekspor silsilah Anda.",
      sections: [
        {
          h: "1. Isi file GEDCOM",
          list: [
            "Orang (catatan INDI): nama, jenis kelamin, tanggal dan tempat lahir serta wafat, dan catatan.",
            "Keluarga (catatan FAM): pasangan dan anak-anaknya, dengan peristiwa pernikahan dan perceraian.",
            "Hubungan anak dengan orang tua, termasuk anak angkat dan anak asuh.",
            "Tanggal perkiraan ditulis sebagai ABT (sekitar), BEF (sebelum), atau AFT (sesudah).",
          ],
          p: [
            "GEDCOM 5.5.1 adalah versi yang dibaca hampir semua aplikasi silsilah, termasuk MyHeritage, Ancestry, FamilySearch, dan Gramps. Isinya berupa teks biasa, sehingga juga awet sebagai arsip penelusuran keluarga Anda.",
          ],
        },
        {
          h: "2. Kapan memakai GEDCOM",
          list: [
            "Untuk memindahkan atau menyalin silsilah ke aplikasi atau situs silsilah lain.",
            "Untuk menyimpan cadangan mandiri dalam format terbuka.",
            "Untuk berbagi hasil penelusuran dengan kerabat yang memakai aplikasi lain.",
          ],
        },
        {
          h: "3. Mengekspor dari Sakdulur",
          p: [
            `Di ${BRAND}, buka pohon, masuk ke pengaturannya, lalu pilih Ekspor. Pilih seluruh pohon atau satu cabang (seseorang beserta keturunannya, leluhurnya, keduanya, atau kerabat beberapa langkah di sekitarnya), lalu pilih formatnya:`,
          ],
          list: [
            "GEDCOM (5.5.1): untuk MyHeritage, Ancestry, FamilySearch, Gramps, dan aplikasi silsilah lainnya.",
            "Spreadsheet (Excel): satu baris per orang; bisa dibuka di Excel, Google Sheets, atau WPS.",
            "Cadangan lengkap (JSON): semua yang disimpan Sakdulur tentang pohon itu.",
            "Gambar (PNG) atau Cetak / simpan sebagai PDF: gambar pohon untuk dibagikan atau dicetak.",
          ],
        },
        {
          h: "4. Perlu diketahui",
          p: [
            "File (GEDCOM, Excel, dan JSON) bisa diunduh oleh pemilik pohon; setiap anggota bisa menyimpan atau mencetak pohon sebagai gambar. GEDCOM 5.5.1 tidak punya kode untuk semua jenis hubungan, sehingga orang tua tiri, wali, dan susuan diekspor sebagai hubungan orang tua dengan catatan jenisnya, dan beberapa detail bisa tampil berbeda setelah diimpor ke aplikasi lain. Sakdulur tidak mengimpor file GEDCOM.",
          ],
        },
      ],
      faq: [
        {
          q: "Apa itu file .ged?",
          a: "File .ged adalah file GEDCOM: file teks berisi orang, keluarga, dan hubungan dalam sebuah silsilah, yang bisa dibaca hampir semua aplikasi silsilah.",
        },
        {
          q: "Bisakah saya mengekspor silsilah dari Sakdulur?",
          a: "Bisa. Pemilik pohon dapat mengekspor seluruh pohon atau satu cabang sebagai GEDCOM, spreadsheet Excel, atau cadangan JSON lengkap, dan setiap anggota bisa mencetaknya atau menyimpannya sebagai gambar.",
        },
        {
          q: "Aplikasi apa saja yang bisa membuka file GEDCOM?",
          a: "Hampir semua aplikasi dan situs silsilah, termasuk MyHeritage, Ancestry, FamilySearch, dan Gramps.",
        },
      ],
    },
  ];
}

export function guides(locale: string): Guide[] {
  return locale === "id" ? guidesId() : guidesEn();
}

export function guide(locale: string, slug: string): Guide | undefined {
  return guides(locale).find((g) => g.slug === slug);
}
