import { useState } from 'react';
import {
  Search,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
  BookOpen,
  Layers,
  HelpCircle,
  GraduationCap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Objection {
  id: number;
  objection: string;
  script: string;
}

interface ProductCategory {
  id: string;
  name: string;
  features: string[];
  usps: string[];
  pricingRange: string;
  faqs: { q: string; a: string }[];
}

interface Guide {
  id: number;
  title: string;
  content: React.ReactNode;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const OBJECTIONS: Objection[] = [
  {
    id: 1,
    objection: 'Price is too high',
    script:
      "I completely understand. Many of our best customers said the same thing before they switched. When you factor in the quality, consistency, and after-sales support we provide, the total cost of ownership is actually lower. Can I show you a quick comparison with what you're currently spending?",
  },
  {
    id: 2,
    objection: 'Already have a supplier',
    script:
      "That's great — it means you already see the value in this category. We're not asking you to replace them overnight. Most of our clients start by giving us one small trial order to compare. Would you be open to a side-by-side test on your next purchase?",
  },
  {
    id: 3,
    objection: 'Not interested right now',
    script:
      "Totally fair — timing matters. Can I ask, is it a matter of budget cycle, current inventory levels, or something else? If I know the reason, I can reach back at exactly the right moment instead of bothering you at the wrong time.",
  },
  {
    id: 4,
    objection: 'I need to think about it',
    script:
      "Of course — it's an important decision. To help you think it through, what specific concern do you want to weigh? If it's about price, quality, or delivery, I can give you concrete answers right now so you have all the facts.",
  },
  {
    id: 5,
    objection: 'Give me a discount',
    script:
      "I hear you — everyone wants the best deal. Our pricing is already optimised to give you the best value without cutting corners on quality. What I can do is look at volume commitments or bundled orders that bring your per-unit cost down. What quantities are you typically ordering?",
  },
  {
    id: 6,
    objection: 'Send me an email',
    script:
      "Absolutely, I'll send something over. To make sure I send you exactly the right information — not a generic brochure — can I ask: what's the one thing that would make you seriously consider switching? I'll address that specifically in my email.",
  },
];

const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: 'paints',
    name: 'Paints',
    features: [
      'Interior & exterior emulsion range',
      'Low-VOC and zero-VOC options available',
      'Over 1 200 tintable shades',
      'Weather-resistant and washable finishes',
      'One-coat coverage technology',
    ],
    usps: [
      'Longest coverage guarantee in the market (7 years)',
      'Same-day tinting available at partner stores',
      'UV-stable pigments — no fading for 5 years',
    ],
    pricingRange: '₹180 – ₹950 per litre depending on grade and finish',
    faqs: [
      {
        q: 'How much area does one litre cover?',
        a: 'Approx. 120–140 sq ft for two coats on a smooth surface.',
      },
      {
        q: 'Do you stock primers?',
        a: 'Yes — wall putty, POP primer, and wood primer are all available.',
      },
      {
        q: 'What is the shelf life?',
        a: '3 years from date of manufacture when stored in a cool, dry place.',
      },
    ],
  },
  {
    id: 'hardware',
    name: 'Hardware',
    features: [
      'Door handles, hinges, locks & latches',
      'Stainless steel, brass, and zinc alloy options',
      'Architectural and industrial grade ranges',
      'Bulk pack pricing for contractors',
      'Custom finishing on select SKUs',
    ],
    usps: [
      'ISO 9001 certified suppliers',
      'Anti-corrosion coating standard on all outdoor items',
      'Replacement warranty up to 2 years',
    ],
    pricingRange: '₹25 – ₹4 500 per piece depending on grade and type',
    faqs: [
      {
        q: 'Do you supply to builders in bulk?',
        a: 'Yes — special bulk pricing is available for orders above 500 units.',
      },
      {
        q: 'Are European-standard mortise locks stocked?',
        a: 'Select SKUs are available; lead time is 5–7 days for special orders.',
      },
    ],
  },
  {
    id: 'other',
    name: 'Other',
    features: [
      'Adhesives, sealants & waterproofing compounds',
      'Abrasives and surface prep materials',
      'Safety equipment and PPE',
      'Brushes, rollers and application tools',
      'Cleaning and maintenance chemicals',
    ],
    usps: [
      'One-stop shop — reduces vendor count for customers',
      'Application tool bundles save customers 15–20%',
      'Expert advice on surface prep and application',
    ],
    pricingRange: '₹50 – ₹2 000 per unit depending on product',
    faqs: [
      {
        q: 'Do you stock waterproofing for terraces?',
        a: 'Yes — both liquid membrane and sheet membrane solutions.',
      },
      {
        q: 'Are your PPE items certified?',
        a: 'All safety items carry BIS / CE certification.',
      },
    ],
  },
];

const GUIDES: Guide[] = [
  {
    id: 1,
    title: 'How to fill Morning Plan',
    content: (
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
        <li>Open the <strong>Morning Plan</strong> page before 9:30 AM every working day.</li>
        <li>Enter the total number of calls you plan to make today in the <em>Planned Calls</em> field.</li>
        <li>List the top 3 priority accounts you intend to visit or call — these lock your focus for the day.</li>
        <li>Set a revenue target for the day in the <em>Target Revenue</em> field based on your monthly quota split.</li>
        <li>Click <strong>Submit Plan</strong>. Your manager will be notified and your day officially begins.</li>
      </ol>
    ),
  },
  {
    id: 2,
    title: 'How scoring works',
    content: (
      <div className="text-sm text-gray-700 space-y-3">
        <p>Your daily score is calculated from four components:</p>
        <table className="w-full text-left border border-gray-200 rounded text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 border-b">Component</th>
              <th className="px-3 py-2 border-b">Weight</th>
              <th className="px-3 py-2 border-b">Example</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="px-3 py-2 border-b">Calls completed vs planned</td><td className="px-3 py-2 border-b">30%</td><td className="px-3 py-2 border-b">8/10 = 80 pts → 24 pts</td></tr>
            <tr><td className="px-3 py-2 border-b">Revenue vs target</td><td className="px-3 py-2 border-b">40%</td><td className="px-3 py-2 border-b">110% attainment → 40 pts</td></tr>
            <tr><td className="px-3 py-2 border-b">Lead updates</td><td className="px-3 py-2 border-b">20%</td><td className="px-3 py-2 border-b">All updated → 20 pts</td></tr>
            <tr><td className="px-3 py-2">Evening Landing submitted</td><td className="px-3 py-2">10%</td><td className="px-3 py-2">Yes → 10 pts</td></tr>
          </tbody>
        </table>
        <p>Total = sum of weighted scores. Maximum possible score per day is <strong>100 points</strong>.</p>
      </div>
    ),
  },
  {
    id: 3,
    title: 'How to update leads',
    content: (
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
        <li>Navigate to the <strong>Leads</strong> page from the sidebar.</li>
        <li>Click on the lead card you interacted with today.</li>
        <li>Update the <em>Stage</em> field to reflect the current status (e.g., Contacted, Interested, Quoted, Closed).</li>
        <li>Add a brief call note in the <em>Activity Log</em> — at least one sentence describing what was discussed.</li>
        <li>Set a <em>Follow-up Date</em> if next action is needed, then click <strong>Save</strong>.</li>
        <li>Repeat for every lead touched during the day before submitting your Evening Landing.</li>
      </ol>
    ),
  },
  {
    id: 4,
    title: 'Understanding your grade',
    content: (
      <div className="text-sm text-gray-700 space-y-3">
        <p>Grades are calculated from your <strong>rolling 30-day average score</strong>.</p>
        <table className="w-full text-left border border-gray-200 rounded text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 border-b">Grade</th>
              <th className="px-3 py-2 border-b">Score Range</th>
              <th className="px-3 py-2 border-b">Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-purple-50"><td className="px-3 py-2 border-b font-bold text-purple-700">S</td><td className="px-3 py-2 border-b">95 – 100</td><td className="px-3 py-2 border-b">Exceptional — top performer</td></tr>
            <tr className="bg-green-50"><td className="px-3 py-2 border-b font-bold text-green-700">A</td><td className="px-3 py-2 border-b">85 – 94</td><td className="px-3 py-2 border-b">Excellent — consistently strong</td></tr>
            <tr className="bg-blue-50"><td className="px-3 py-2 border-b font-bold text-blue-700">B</td><td className="px-3 py-2 border-b">70 – 84</td><td className="px-3 py-2 border-b">Good — meets expectations</td></tr>
            <tr className="bg-yellow-50"><td className="px-3 py-2 border-b font-bold text-yellow-700">C</td><td className="px-3 py-2 border-b">55 – 69</td><td className="px-3 py-2 border-b">Average — room to improve</td></tr>
            <tr className="bg-orange-50"><td className="px-3 py-2 border-b font-bold text-orange-700">D</td><td className="px-3 py-2 border-b">40 – 54</td><td className="px-3 py-2 border-b">Below average — needs attention</td></tr>
            <tr className="bg-red-50"><td className="px-3 py-2 font-bold text-red-700">F</td><td className="px-3 py-2">0 – 39</td><td className="px-3 py-2">Failing — immediate coaching required</td></tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: 5,
    title: 'How to use Evening Landing',
    content: (
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
        <li>Open <strong>Evening Landing</strong> from the sidebar after 5:00 PM.</li>
        <li>Enter the <em>Actual Calls Made</em> and <em>Actual Revenue Collected</em> for the day.</li>
        <li>Fill in the <em>Wins</em> field — what went well today (even one small thing counts).</li>
        <li>Fill in the <em>Blockers</em> field — what slowed you down or needs manager help.</li>
        <li>Rate your energy level for the day (1–5) and click <strong>Submit Landing</strong> before 7:00 PM to earn full points.</li>
      </ol>
    ),
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ObjectionCard({ objection }: { objection: Objection }) {
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(objection.script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="relative h-52 cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between shadow-sm"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-2 block">
              Objection
            </span>
            <p className="text-gray-800 font-semibold text-base leading-snug">
              "{objection.objection}"
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-3">Click to reveal script</p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 bg-indigo-600 border border-indigo-700 rounded-xl p-5 flex flex-col justify-between shadow-sm"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-200 mb-2 block">
              Script
            </span>
            <p className="text-white text-sm leading-relaxed line-clamp-5">
              {objection.script}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold bg-white text-indigo-700 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors w-fit"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy Script'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ category }: { category: ProductCategory }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-gray-800 text-base">{category.name}</span>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 bg-white border-t border-gray-100 space-y-5">
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Key Features</h4>
            <ul className="space-y-1">
              {category.features.map((f, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">USPs</h4>
            <ul className="space-y-1">
              {category.usps.map((u, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  {u}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Pricing Range</h4>
            <p className="text-sm text-gray-700">{category.pricingRange}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Common Customer Questions</h4>
            <div className="space-y-3">
              {category.faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-gray-800 mb-1">Q: {faq.q}</p>
                  <p className="text-sm text-gray-600">A: {faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-gray-800 text-sm">{guide.title}</span>
        {open ? <ChevronUp size={18} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white border-t border-gray-100 pt-4">
          {guide.content}
        </div>
      )}
    </div>
  );
}

const TRAINING_MODULES = [
  { id: 1, title: 'Module 1: Sales Fundamentals', description: 'Learn the core principles of consultative selling and relationship-based sales.' },
  { id: 2, title: 'Module 2: Objection Handling', description: 'Master techniques to turn objections into opportunities.' },
  { id: 3, title: 'Module 3: CRM Best Practices', description: 'How to keep your pipeline clean, updated and actionable every day.' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'scripts' | 'knowledge' | 'guides' | 'training';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'scripts', label: 'Sales Scripts', icon: <BookOpen size={15} /> },
  { id: 'knowledge', label: 'Product Knowledge', icon: <Layers size={15} /> },
  { id: 'guides', label: 'How-to Guides', icon: <HelpCircle size={15} /> },
  { id: 'training', label: 'Training', icon: <GraduationCap size={15} /> },
];

export default function Playbook() {
  const [activeTab, setActiveTab] = useState<Tab>('scripts');
  const [search, setSearch] = useState('');

  const filteredObjections = OBJECTIONS.filter(
    (o) =>
      o.objection.toLowerCase().includes(search.toLowerCase()) ||
      o.script.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sales Playbook</h1>
          <p className="text-gray-500 text-sm mt-1">Scripts, product knowledge, guides and training in one place.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 shadow-sm w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Sales Scripts ── */}
        {activeTab === 'scripts' && (
          <div>
            <div className="relative mb-5">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search objections..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
            </div>

            {filteredObjections.length === 0 ? (
              <p className="text-center text-gray-400 py-16 text-sm">No objections match your search.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredObjections.map((obj) => (
                  <ObjectionCard key={obj.id} objection={obj} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Product Knowledge ── */}
        {activeTab === 'knowledge' && (
          <div className="space-y-3">
            {PRODUCT_CATEGORIES.map((cat) => (
              <ProductCard key={cat.id} category={cat} />
            ))}
          </div>
        )}

        {/* ── How-to Guides ── */}
        {activeTab === 'guides' && (
          <div className="space-y-3">
            {GUIDES.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        )}

        {/* ── Training ── */}
        {activeTab === 'training' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {TRAINING_MODULES.map((mod) => (
                <div
                  key={mod.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                      <Play size={22} className="text-indigo-400 ml-0.5" />
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">{mod.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{mod.description}</p>
                  </div>
                  <div className="mt-4">
                    <span className="inline-block text-xs font-semibold bg-amber-100 text-amber-700 rounded-full px-3 py-1">
                      Coming Soon
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-indigo-900 text-sm mb-1">Want a specific training topic?</h3>
                <p className="text-xs text-indigo-700">Let us know what you need — we'll prioritise it in the next content batch.</p>
              </div>
              <button className="flex-shrink-0 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">
                Request Training
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
