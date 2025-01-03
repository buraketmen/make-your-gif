export const Spinner = ({ size = 12 }: { size?: number }) => {
  return <div className={`w-${size} h-${size} border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin mx-auto`} />
};

export const SpinnerText = ({ text }: { text: string }) => {
  return <p className="text-xs md:text-sm text-gray-500">{text}</p>
}
