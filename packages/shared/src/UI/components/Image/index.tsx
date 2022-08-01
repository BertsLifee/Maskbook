import { makeStyles, useStylesExtends } from '@masknet/theme'
import { CircularProgress, useTheme } from '@mui/material'
import type { ImgHTMLAttributes } from 'react'
import { useAsync } from 'react-use'

const useStyles = makeStyles()(() => ({}))

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement>, withClasses<'loadingFailImage'> {
    fallbackImage?: URL
}

export function Image(props: ImageProps) {
    const classes = useStylesExtends(useStyles(), props)
    const theme = useTheme()
    const maskImageURL =
        theme.palette.mode === 'dark'
            ? new URL('./mask_dark.png', import.meta.url)
            : new URL('./mask_light.png', import.meta.url)
    const { loading, value } = useAsync(async () => {
        if (!props.src) return
        const data = await globalThis.r2d2Fetch(`https://cors.r2d2.to?${props.src}`)
        return URL.createObjectURL(await data.blob())
    }, [props.src])

    return (
        <>
            {loading ? (
                <CircularProgress style={{ width: 24, height: 24 }} />
            ) : (
                <img
                    crossOrigin="anonymous"
                    {...props}
                    src={value ?? props.src}
                    onError={(event) => {
                        const target = event.currentTarget as HTMLImageElement
                        target.src = (props.fallbackImage ?? maskImageURL).toString()
                        target.classList.add(classes.loadingFailImage ?? '')
                    }}
                />
            )}
        </>
    )
}
