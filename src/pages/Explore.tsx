import { ExploreHeader } from "@/components/explore/ExploreHeader";
import { ExploreGrid } from "@/components/explore/ExploreGrid";
import { mockExploreItems } from "@/data/mockData";

const Explore = () => {
  return (
    <div className="min-h-screen">
      <ExploreHeader />
      <ExploreGrid items={mockExploreItems} />
    </div>
  );
};

export default Explore;
