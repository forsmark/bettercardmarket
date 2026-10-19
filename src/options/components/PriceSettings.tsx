import { useState } from "react";
import { PRICE_CACHE_KEYS } from "../../shared/card-prices";
import { SwitchField } from "./SwitchField";

type PriceSettingsProps = {
  showPrices: boolean;
  onShowPricesChange: (showPrices: boolean) => void;
};

export const PriceSettings = ({
  showPrices,
  onShowPricesChange,
}: PriceSettingsProps) => {
  const [cleared, setCleared] = useState(false);

  return (
    <>
      <SwitchField
        label="Show estimated prices on wants lists"
        description="Adds a price for each want and a total. Each want uses its cheapest allowed printing, with Cardmarket prices that Scryfall updates once a day."
        checked={showPrices}
        onChange={onShowPricesChange}
      />
      <div className="field field--inline">
        <div className="field__text">
          <p className="field__label">Cached price data</p>
          <p className="field__description">
            Prices are kept for a day. Want details are loaded again when you
            edit a want.
          </p>
        </div>
        <button
          type="button"
          className="button button--quiet"
          disabled={cleared}
          onClick={() => {
            void chrome.storage.local
              .remove([...PRICE_CACHE_KEYS])
              .then(() => setCleared(true));
          }}
        >
          {cleared ? "Cache cleared" : "Clear cache"}
        </button>
      </div>
    </>
  );
};
