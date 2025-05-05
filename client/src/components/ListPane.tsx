import { Button } from "./ui/button";

type ListPaneProps<T> = {
  items: T[];
  listItems?: () => void; // Make optional
  clearItems?: () => void; // Make optional
  setSelectedItem: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  title: string;
  buttonText: string;
  isButtonDisabled?: boolean;
};

const ListPane = <T extends object>({
  items,
  listItems,
  clearItems,
  setSelectedItem,
  renderItem,
  title,
  buttonText,
  isButtonDisabled,
}: ListPaneProps<T>) => (
  <div className="bg-card rounded-lg shadow">
    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
      <h3 className="font-semibold dark:text-white">{title}</h3>
    </div>
    {/* Conditionally render buttons only if functions are provided */}
    {/* Reverted flex layout changes from previous attempt */}
    <div className="p-4">
      {listItems && (
        <Button
          variant="outline"
          className="w-full mb-4"
          onClick={listItems}
          disabled={isButtonDisabled}
        >
          {buttonText}
        </Button>
      )}
      {clearItems && (
        <Button
          variant="outline"
          className="w-full mb-4"
          onClick={clearItems}
          disabled={items.length === 0}
        >
          Clear
        </Button>
      )}
      {/* Reverted flex layout changes from previous attempt */}
      <div className="space-y-2 overflow-y-auto max-h-96">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            onClick={() => setSelectedItem(item)}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ListPane;
