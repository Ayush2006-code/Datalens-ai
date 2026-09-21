// Generates a realistic demo workbook that behaves exactly like an uploaded
// one — it goes through the same profiler/KPI/chart/insight pipeline as any
// real file, nothing here is pre-rendered.

const REGIONS = ['North', 'South', 'East', 'West']
const CATEGORIES = ['Electronics', 'Furniture', 'Clothing', 'Home & Kitchen', 'Sporting Goods']
const PRODUCTS_BY_CATEGORY = {
  Electronics: ['Wireless Earbuds', '4K Monitor', 'Smart Watch', 'Bluetooth Speaker', 'Laptop Stand'],
  Furniture: ['Office Chair', 'Standing Desk', 'Bookshelf', 'Sofa', 'Coffee Table'],
  Clothing: ['Denim Jacket', 'Running Shoes', 'Wool Sweater', 'Cotton Tee', 'Rain Jacket'],
  'Home & Kitchen': ['Air Fryer', 'Blender', 'Cookware Set', 'Vacuum Cleaner', 'Coffee Maker'],
  'Sporting Goods': ['Yoga Mat', 'Dumbbell Set', 'Cycling Helmet', 'Tennis Racket', 'Camping Tent'],
}
const SALESPEOPLE = ['Asha Rao', 'Daniel Kim', 'Priya Nair', 'Marcus Webb', 'Fatima Ali', 'Leo Santos']
const CUSTOMER_FIRST = ['Aarav', 'Maya', 'Liam', 'Sofia', 'Noah', 'Ananya', 'Ethan', 'Zara', 'Kabir', 'Mia']
const CUSTOMER_LAST = ['Sharma', 'Patel', 'Johnson', 'Garcia', 'Chen', 'Khan', 'Brown', 'Verma', 'Lopez', 'Singh']

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)]
}

export function buildDemoWorkbook() {
  const rand = seededRandom(42)
  const rowCount = 480
  const start = new Date('2025-01-01')
  const salesRows = []

  for (let i = 0; i < rowCount; i++) {
    const category = pick(rand, CATEGORIES)
    const product = pick(rand, PRODUCTS_BY_CATEGORY[category])
    const region = pick(rand, REGIONS)
    const daysOffset = Math.floor(rand() * 364)
    const orderDate = new Date(start.getTime() + daysOffset * 86400000)
    const quantity = 1 + Math.floor(rand() * 8)
    const basePrice = 15 + rand() * 480
    const revenue = Math.round(basePrice * quantity * 100) / 100
    const costRatio = 0.45 + rand() * 0.25
    const cost = Math.round(revenue * costRatio * 100) / 100
    const discountPct = rand() < 0.3 ? Math.round(rand() * 20) : 0
    const profit = Math.round((revenue - cost - revenue * (discountPct / 100)) * 100) / 100
    const customer = `${pick(rand, CUSTOMER_FIRST)} ${pick(rand, CUSTOMER_LAST)}`

    salesRows.push({
      'Order ID': `ORD-${10000 + i}`,
      'Order Date': orderDate.toISOString().slice(0, 10),
      Customer: customer,
      Region: region,
      Category: category,
      Product: product,
      Quantity: quantity,
      Revenue: revenue,
      Cost: cost,
      Profit: profit,
      Discount: discountPct,
      Salesperson: pick(rand, SALESPEOPLE),
    })
  }

  // Inject a handful of intentional data-quality issues so Data Quality /
  // anomaly detection have something real to surface, same as a messy
  // real-world export would.
  salesRows[12].Customer = ''
  salesRows[45].Customer = ''
  salesRows[88]['Order Date'] = ''
  salesRows[150] = { ...salesRows[149] } // exact duplicate row
  salesRows[300].Revenue = salesRows[300].Revenue * 18 // extreme outlier

  const customersSeen = new Map()
  for (const row of salesRows) {
    if (!row.Customer) continue
    if (!customersSeen.has(row.Customer)) {
      customersSeen.set(row.Customer, {
        Customer: row.Customer,
        Region: row.Region,
        'First Order': row['Order Date'],
        'Total Orders': 0,
        'Total Spend': 0,
      })
    }
    const c = customersSeen.get(row.Customer)
    c['Total Orders'] += 1
    c['Total Spend'] = Math.round((c['Total Spend'] + row.Revenue) * 100) / 100
  }

  const productRows = []
  for (const [category, products] of Object.entries(PRODUCTS_BY_CATEGORY)) {
    for (const product of products) {
      const matching = salesRows.filter((r) => r.Product === product)
      const unitsSold = matching.reduce((s, r) => s + r.Quantity, 0)
      const revenue = Math.round(matching.reduce((s, r) => s + r.Revenue, 0) * 100) / 100
      productRows.push({
        Product: product,
        Category: category,
        'Units Sold': unitsSold,
        Revenue: revenue,
        'Avg. Order Size': matching.length ? Math.round((unitsSold / matching.length) * 10) / 10 : 0,
      })
    }
  }

  return {
    fileName: 'Demo Sales Workbook.xlsx',
    sheets: {
      Sales: { columns: Object.keys(salesRows[0]), rows: salesRows },
      Customers: {
        columns: ['Customer', 'Region', 'First Order', 'Total Orders', 'Total Spend'],
        rows: [...customersSeen.values()],
      },
      Products: {
        columns: ['Product', 'Category', 'Units Sold', 'Revenue', 'Avg. Order Size'],
        rows: productRows,
      },
    },
    warnings: [],
  }
}
