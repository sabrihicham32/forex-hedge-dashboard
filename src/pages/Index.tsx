
import React from "react";
import HedgeCalculator from "@/components/HedgeCalculator";
import { STRATEGIES } from "@/utils/forexData";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 pb-12">
      <header className="py-6 border-b border-border/50 backdrop-blur-sm sticky top-0 z-10 bg-background/80">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                FX<span className="font-light">Hedge</span>
              </h1>
            </div>
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <a href="#calculator" className="text-sm font-medium hover:text-primary transition-colors">
                    Calculator
                  </a>
                </li>
                <li>
                  <a href="#strategies" className="text-sm font-medium hover:text-primary transition-colors">
                    Strategies
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <main>
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <div className="animate-fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
                Foreign Exchange Hedging
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                Optimize your currency risk management with intelligent hedging strategies
              </p>
            </div>
          </div>
        </section>

        <section id="calculator" className="py-12">
          <HedgeCalculator />
        </section>

        <section id="strategies" className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Hedging Strategies</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(STRATEGIES).map(([key, { name, description }]) => (
                <div 
                  key={key} 
                  className="glass-effect card-hover p-6 rounded-xl"
                >
                  <h3 className="text-xl font-semibold mb-3">{name}</h3>
                  <p className="text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} FXHedge Dashboard • All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
