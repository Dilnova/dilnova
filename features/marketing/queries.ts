export type Product = {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  vendorName: string;
  vendorSlug: string;
};

export type FeaturedSeries = {
  id: string;
  title: string;
  description: string;
  products: Product[];
};

/**
 * Stub function to fetch featured product series.
 * Replace with real database query when ready.
 */
export async function getFeaturedSeries(): Promise<FeaturedSeries[]> {
  return [
    {
      id: "series-1",
      title: "Industrial Essentials",
      description: "Heavy-duty machinery and contractor-grade tools built for reliability.",
      products: [
        {
          id: "prod-1",
          name: "Pro-Series Hammer Drill",
          price: "$249.99",
          imageUrl: "",
          vendorName: "Distar Hardware",
          vendorSlug: "distar-hardware",
        },
        {
          id: "prod-2",
          name: "Titanium Wrench Set",
          price: "$89.99",
          imageUrl: "",
          vendorName: "Distar Hardware",
          vendorSlug: "distar-hardware",
        },
        {
          id: "prod-3",
          name: "Industrial Work Gloves",
          price: "$24.99",
          imageUrl: "",
          vendorName: "Distar Hardware",
          vendorSlug: "distar-hardware",
        },
      ],
    },
    {
      id: "series-2",
      title: "Cyber Workspace",
      description: "High-performance components and setups for developers.",
      products: [
        {
          id: "prod-4",
          name: "Quantum Mechanical Keyboard",
          price: "$199.99",
          imageUrl: "",
          vendorName: "Distar Tech Store",
          vendorSlug: "distar-tech",
        },
        {
          id: "prod-5",
          name: "Ergonomic Mesh Chair",
          price: "$549.99",
          imageUrl: "",
          vendorName: "Distar Tech Store",
          vendorSlug: "distar-tech",
        },
        {
          id: "prod-6",
          name: "Ultra-Wide Dev Monitor",
          price: "$899.99",
          imageUrl: "",
          vendorName: "Distar Tech Store",
          vendorSlug: "distar-tech",
        },
      ],
    },
  ];
}
