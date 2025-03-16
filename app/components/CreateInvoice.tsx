"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Loader2, Search } from "lucide-react";
import { useActionState, useEffect, useState, useRef } from "react";
import { SubmitButton } from "./SubmitButtons";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";

import { formatCurrency } from "../utils/formatCurrency";
import { createInvoice, getNextInvoiceNumber, searchClients } from "@/app/actions";
import { invoiceSchema } from "../utils/zodSchemas";

interface Client {
  id: string;
  name: string;
  email: string;
  address: string;
}

interface iAppProps {
  firstName: string;
  lastName: string;
  address: string;
  email: string;
}

export function CreateInvoice({
  address,
  email,
  firstName,
  lastName,
}: iAppProps) {
  const [lastResult, action] = useActionState(createInvoice, undefined);
  const [form, fields] = useForm({
    lastResult,

    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: invoiceSchema,
      });
    },

    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rate, setRate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Client search state
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [searchingClients, setSearchingClients] = useState(false);
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Refs for client form fields
  const clientNameRef = useRef<HTMLInputElement>(null);
  const clientEmailRef = useRef<HTMLInputElement>(null);
  const clientAddressRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  // Fetch the next invoice number when the component mounts
  useEffect(() => {
    const fetchNextInvoiceNumber = async () => {
      try {
        const response = await getNextInvoiceNumber();
        setNextInvoiceNumber(response);
      } catch (error) {
        console.error("Failed to get next invoice number:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNextInvoiceNumber();
  }, []);

  // Client search with debounce
  useEffect(() => {
    if (clientSearchTerm.length < 2) {
      setClientResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingClients(true);
        const results = await searchClients(clientSearchTerm);
        setClientResults(results);
      } catch (error) {
        console.error("Failed to search clients:", error);
      } finally {
        setSearchingClients(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [clientSearchTerm]);

  // Close search panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchPanelRef.current && !searchPanelRef.current.contains(event.target as Node)) {
        setShowClientSearch(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setShowClientSearch(false);
    setClientSearchTerm(client.name);
    
    // Update the client form fields
    if (clientNameRef.current) clientNameRef.current.value = client.name;
    if (clientEmailRef.current) clientEmailRef.current.value = client.email;
    if (clientAddressRef.current) clientAddressRef.current.value = client.address;
  };

  const openClientSearch = () => {
    setShowClientSearch(true);
    // If there's a client name already, use it as the search term
    if (clientNameRef.current && clientNameRef.current.value) {
      setClientSearchTerm(clientNameRef.current.value);
    }
  };

  const calculateTotal = (Number(quantity) || 0) * (Number(rate) || 0);

  return (
    <Card className="w-full max-w-4xl mx-auto ">
      <CardContent className="p-6">
        <form id={form.id} action={action} onSubmit={form.onSubmit} noValidate>
          {/* CALENDAR INPUT  */}
          <input
            type="hidden"
            name={fields.date.name}
            value={selectedDate.toISOString()}
          />

          {/* TOTAL AMOUNT INPUT */}
          <input
            name={fields.total.name}
            value={String(calculateTotal)}
            type="hidden"
          />

          <div className="flex flex-col gap-1 w-fit mb-6">
            <div className="flex items-center gap-4">
              <Badge variant="secondary">Draft</Badge>
              <Input
                name={fields.invoiceName.name}
                key={fields.invoiceName.key}
                defaultValue={fields.clientName.initialValue}
                placeholder="test 123"
              />
            </div>
            <p className="text-sm text-red-500">{fields.invoiceName.errors}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div>
              <Label>Invoice No.</Label>
              <div className="flex">
                <span className="px-3 border border-r-0 rounded-l-md bg-muted flex items-center">
                  #
                </span>
                <Input
                  name={fields.invoiceNumber.name}
                  key={fields.invoiceNumber.key}
                  defaultValue={nextInvoiceNumber || fields.invoiceNumber.initialValue}
                  placeholder={isLoading ? "Loading..." : "005"}
                  className="rounded-l-none"
                  readOnly={isLoading}
                />
              </div>
              <p className="text-sm text-red-500">
                {fields.invoiceNumber.errors}
              </p>
            </div>
            <div>
              <Label> Currency</Label>
              <Select
                defaultValue="UGX"
                name={fields.currency.name}
                key={fields.currency.key}
                onValueChange={(value) => setCurrency(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UGX">Uganda Shillings -- UGX</SelectItem>
                  <SelectItem value="USD">
                    United States Dollar -- USD
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-red-500">{fields.currency.errors}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label>From:</Label>
              <div className="space-y-2">
                <Input
                  name={fields.fromName.name}
                  key={fields.fromName.key}
                  placeholder="Your Name"
                  defaultValue={firstName + " " + lastName}
                />
                <p className="text-sm text-red-500">{fields.fromName.errors}</p>
                <Input
                  name={fields.fromEmail.name}
                  key={fields.fromEmail.key}
                  placeholder="Your Email"
                  defaultValue={email}
                />
                <p className="text-sm text-red-500">
                  {fields.fromEmail.errors}
                </p>
                <Input
                  name={fields.fromAddress.name}
                  key={fields.fromAddress.key}
                  placeholder="Your Address"
                  defaultValue={address}
                />
                <p className="text-sm text-red-500">
                  {fields.fromAddress.errors}
                </p>
              </div>
            </div>

            <div>
              <Label>To:</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-grow">
                    <Input
                      name={fields.clientName.name}
                      key={fields.clientName.key}
                      ref={clientNameRef}
                      defaultValue={fields.clientName.initialValue}
                      placeholder="Client Name"
                      value={clientSearchTerm}
                      onChange={(e) => {
                        setClientSearchTerm(e.target.value);
                      }}
                      onClick={openClientSearch}
                    />
                  </div>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={openClientSearch}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {showClientSearch && (
                  <div className="relative" ref={searchPanelRef}>
                    <div className="absolute z-10 w-full">
                      <Card>
                        <CardContent className="p-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Input
                              placeholder="Search clients..."
                              value={clientSearchTerm}
                              onChange={(e) => setClientSearchTerm(e.target.value)}
                              autoFocus
                            />
                            {searchingClients && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {clientResults.length === 0 ? (
                              <p className="text-sm text-muted-foreground p-2">
                                {clientSearchTerm.length < 2 
                                  ? "Type at least 2 characters to search" 
                                  : searchingClients 
                                    ? "Searching..." 
                                    : "No clients found"}
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {clientResults.map((client) => (
                                  <div
                                    key={client.id}
                                    className="flex items-center p-2 hover:bg-muted cursor-pointer rounded"
                                    onClick={() => handleSelectClient(client)}
                                  >
                                    <div>
                                      <p className="font-medium">{client.name}</p>
                                      <p className="text-sm text-muted-foreground">{client.email}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex justify-end">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setShowClientSearch(false)}
                            >
                              Close
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
                <p className="text-sm text-red-500">
                  {fields.clientName.errors}
                </p>
                <Input
                  name={fields.clientEmail.name}
                  key={fields.clientEmail.key}
                  ref={clientEmailRef}
                  defaultValue={fields.clientEmail.initialValue}
                  placeholder="Client Email"
                />
                <p className="text-sm text-red-500">
                  {fields.clientEmail.errors}
                </p>
                <Input
                  name={fields.clientAddress.name}
                  key={fields.clientAddress.key}
                  ref={clientAddressRef}
                  defaultValue={fields.clientAddress.initialValue}
                  placeholder="Client Address"
                />
                <p className="text-sm text-red-500">
                  {fields.clientAddress.errors}
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <div>
                <Label>Date</Label>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[290px] text-left justify-start"
                  >
                    <CalendarIcon />
                    {selectedDate ? (
                      new Intl.DateTimeFormat("en-UG", {
                        dateStyle: "long",
                      }).format(selectedDate)
                    ) : (
                      <span>Pick a Date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Calendar
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date || new Date())}
                    mode="single"
                    fromDate={new Date()}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-sm text-red-500">{fields.date.errors}</p>
            </div>

            <div>
              <Label>Invoice Due</Label>
              <Select
                name={fields.dueDate.name}
                key={fields.dueDate.key}
                defaultValue={fields.dueDate.initialValue}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select due date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Invoice Due</SelectItem>
                  <SelectItem value="18">Net 15</SelectItem>
                  <SelectItem value="30">Net 30</SelectItem>
                </SelectContent>
              </Select>
              <p
                className="text-sm text-red-500"
              >
                {fields.dueDate.errors}
              </p>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-12 gap4 mb-2 font-medium">
              <p className="col-span-6">Description</p>
              <p className="col-span-2">Quantity</p>
              <p className="col-span-2">Rate</p>
              <p className="col-span-2">Amount</p>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-4">
              <div className="col-span-6">
                <Textarea
                  name={fields.invoiceItemDescription.name}
                  key={fields.invoiceItemDescription.key}
                  defaultValue={fields.invoiceItemDescription.initialValue}
                  placeholder="Item name & description"
                />
                <p className="text-sm text-red-500">
                  {fields.invoiceItemDescription.errors}
                </p>
              </div>
              <div className="col-span-2">
                <Input
                  name={fields.invoiceItemQuantity.name}
                  key={fields.invoiceItemQuantity.key}
                  type="number"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <p className="text-sm text-red-500">
                  {fields.invoiceItemQuantity.errors}
                </p>
              </div>
              <div className="col-span-2">
                <Input
                  name={fields.invoiceItemRate.name}
                  key={fields.invoiceItemRate.key}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  type="number"
                  placeholder="0"
                />
                <p className="text-sm text-red-500">
                  {fields.invoiceItemRate.errors}
                </p>
              </div>

              <div className="col-span-2">
                <Input
                  value={formatCurrency({
                    amount: calculateTotal,
                    currency: currency as "UGX" | "USD",
                  })}
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-1/3">
              <div className="flex justify-between py-2">
                <span>Subtotal</span>
                <span>
                  {formatCurrency({
                    amount: calculateTotal,
                    currency: currency as "UGX" | "USD",
                  })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t">
                <span>Total ({currency})</span>
                <span className="font-medium underline underline-offset-2">
                  {formatCurrency({
                    amount: calculateTotal,
                    currency: currency as "UGX" | "USD",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label>Note</Label>
            <Textarea
              name={fields.note.name}
              key={fields.note.key}
              defaultValue={fields.note.initialValue}
              placeholder="Add your notes here...."
            />
            <p className="text-sm text-red-500">{fields.note.errors}</p>
          </div>

          <div className="flex items-center justify-end mt-6">
            <div>
              <SubmitButton text="Send Invoice to Client" />
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}