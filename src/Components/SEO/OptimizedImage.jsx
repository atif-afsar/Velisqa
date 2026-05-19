/**
 * Lightweight image helper: lazy loading, async decode, explicit dimensions to reduce CLS.
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  loading = "lazy",
  fetchPriority,
  sizes,
  ...rest
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      sizes={sizes}
      className={className}
      {...rest}
    />
  );
}
