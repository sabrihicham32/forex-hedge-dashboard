
import React from "react";
import { HoverCard, Heading, ValueDisplay } from "@/components/ui/layout";
import { STRATEGIES } from "@/utils/forexData";

interface StrategyInfoProps {
  selectedStrategy: string;
  results: any;
  params: any;
}

const StrategyInfo = ({ selectedStrategy, results, params }: StrategyInfoProps) => {
  if (!results) return null;

  const formatNumber = (num: number | undefined) => {
    return num !== undefined ? num.toFixed(4) : "N/A";
  };

  const formatPercentage = (num: number | undefined) => {
    return num !== undefined ? (num * 100).toFixed(2) + "%" : "N/A";
  };

  const renderStrategyDetails = () => {
    switch (selectedStrategy) {
      case "collar":
        return (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <ValueDisplay
                label="Put Strike"
                value={formatNumber(results.putStrike)}
                highlight
              />
              <ValueDisplay
                label="Call Strike"
                value={formatNumber(results.callStrike)}
                highlight
              />
              <ValueDisplay
                label="Put Premium"
                value={formatNumber(results.putPrice)}
                suffix="% of notional"
              />
              <ValueDisplay
                label="Call Premium"
                value={formatNumber(results.callPrice)}
                suffix="% of notional"
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-sm">
              <p>
                This zero-cost collar protects against rates below{" "}
                <strong>{formatNumber(results.putStrike)}</strong> while
                capping gains above{" "}
                <strong>{formatNumber(results.callStrike)}</strong>.
              </p>
            </div>
          </>
        );

      case "forward":
        return (
          <>
            <div className="mb-4">
              <ValueDisplay
                label="Forward Rate"
                value={formatNumber(results.forwardRate)}
                highlight
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-sm">
              <p>
                The forward contract locks in the exchange rate at{" "}
                <strong>{formatNumber(results.forwardRate)}</strong> for the specified maturity,
                removing all uncertainty but also potential upside.
              </p>
            </div>
          </>
        );

      case "strangle":
        return (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <ValueDisplay
                label="Put Strike"
                value={formatNumber(results.putStrike)}
                highlight
              />
              <ValueDisplay
                label="Call Strike"
                value={formatNumber(results.callStrike)}
                highlight
              />
              <ValueDisplay
                label="Put Premium"
                value={formatNumber(results.putPrice)}
                suffix="% of notional"
              />
              <ValueDisplay
                label="Call Premium"
                value={formatNumber(results.callPrice)}
                suffix="% of notional"
              />
              <ValueDisplay
                label="Total Premium"
                value={formatNumber(results.totalPremium)}
                suffix="% of notional"
                className="col-span-2"
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-sm">
              <p>
                This strangle provides protection against rates outside the range
                of <strong>{formatNumber(results.putStrike)}</strong> to{" "}
                <strong>{formatNumber(results.callStrike)}</strong> with a premium
                cost of <strong>{formatNumber(results.totalPremium)}</strong>.
              </p>
            </div>
          </>
        );

      case "straddle":
        return (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <ValueDisplay
                label="Strike"
                value={formatNumber(results.strike)}
                highlight
              />
              <ValueDisplay
                label="Total Premium"
                value={formatNumber(results.totalPremium)}
                suffix="% of notional"
              />
              <ValueDisplay
                label="Put Premium"
                value={formatNumber(results.putPrice)}
                suffix="% of notional"
              />
              <ValueDisplay
                label="Call Premium"
                value={formatNumber(results.callPrice)}
                suffix="% of notional"
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-sm">
              <p>
                This straddle protects against volatility in either direction
                from the at-the-money strike of{" "}
                <strong>{formatNumber(results.strike)}</strong> with a premium
                cost of <strong>{formatNumber(results.totalPremium)}</strong>.
              </p>
            </div>
          </>
        );

      case "put":
        return (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <ValueDisplay
                label="Put Strike"
                value={formatNumber(results.putStrike)}
                highlight
              />
              <ValueDisplay
                label="Put Premium"
                value={formatNumber(results.putPrice)}
                suffix="% of notional"
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-sm">
              <p>
                This put option provides downside protection below{" "}
                <strong>{formatNumber(results.putStrike)}</strong> with a premium
                cost of <strong>{formatNumber(results.putPrice)}</strong>.
              </p>
            </div>
          </>
        );

      case "call":
        return (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <ValueDisplay
                label="Call Strike"
                value={formatNumber(results.callStrike)}
                highlight
              />
              <ValueDisplay
                label="Call Premium"
                value={formatNumber(results.callPrice)}
                suffix="% of notional"
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-sm">
              <p>
                This call option provides upside protection above{" "}
                <strong>{formatNumber(results.callStrike)}</strong> with a premium
                cost of <strong>{formatNumber(results.callPrice)}</strong>.
              </p>
            </div>
          </>
        );

      case "seagull":
        return (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <ValueDisplay
                label="Put Sell Strike (Low)"
                value={formatNumber(results.putSellStrike)}
              />
              <ValueDisplay
                label="Put Buy Strike (Mid)"
                value={formatNumber(results.putBuyStrike)}
                highlight
              />
              <ValueDisplay
                label="Call Sell Strike (High)"
                value={formatNumber(results.callSellStrike)}
              />
              <ValueDisplay
                label="Net Premium"
                value={formatNumber(results.netPremium)}
                suffix="% of notional"
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-sm">
              <p>
                This seagull strategy provides protection between{" "}
                <strong>{formatNumber(results.putBuyStrike)}</strong> and{" "}
                <strong>{formatNumber(results.callSellStrike)}</strong> with limited
                protection below{" "}
                <strong>{formatNumber(results.putSellStrike)}</strong>. Net premium is{" "}
                <strong>{formatNumber(results.netPremium)}</strong>.
              </p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <HoverCard>
      <Heading level={3}>
        {STRATEGIES[selectedStrategy as keyof typeof STRATEGIES].name} - Results
      </Heading>
      {renderStrategyDetails()}
    </HoverCard>
  );
};

export default StrategyInfo;
